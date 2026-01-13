const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables');
}

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout Session for subscription
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, modelId, selectedImageId, planType } = req.body;
    console.log('Received checkout session request:', { priceId, planType, modelId, selectedImageId });
    
    // Get user ID from Supabase auth token in Authorization header
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (e) {
        console.error('Error verifying token:', e);
      }
    }

    // Fallback to x-user-id header if provided
    if (!userId) {
      userId = req.headers['x-user-id'];
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get user email from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Create or retrieve Stripe customer
    let customerId;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (existingProfile?.stripe_customer_id) {
      customerId = existingProfile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: userId
        }
      });
      customerId = customer.id;

      // Save customer ID to Supabase
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Determine if this is the Ultimate plan (for trial period)
    // Use planType from request body if provided, otherwise look it up
    let finalPlanType = planType;
    if (!finalPlanType) {
      const { data: priceMapping } = await supabase
        .from('stripe_price_mapping')
        .select('plan_type')
        .eq('price_id', priceId)
        .single();
      finalPlanType = priceMapping?.plan_type;
    }

    const isUltimatePlan = finalPlanType === 'ultimate';
    console.log('Plan type check:', { planType, finalPlanType, isUltimatePlan, priceId });

    // Create checkout session
    const sessionConfig = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ui_mode: 'embedded',
      return_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}&modelId=${modelId || ''}&selectedImageId=${selectedImageId || ''}`,
      metadata: {
        user_id: userId,
        model_id: modelId || '',
        selected_image_id: selectedImageId || '',
        plan_type: finalPlanType || ''
      }
    };

    // Add 1-day free trial for Ultimate plan
    if (isUltimatePlan) {
      sessionConfig.subscription_data = {
        trial_period_days: 1
      };
      console.log('Added trial_period_days: 1 to subscription_data');
    } else {
      console.log('Not Ultimate plan, skipping trial period');
    }

    console.log('Creating Stripe checkout session with config:', JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    // Retrieve the session to verify trial period was set
    const retrievedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['subscription']
    });
    
    console.log('Checkout session created:', session.id);
    console.log('Trial period in config:', sessionConfig.subscription_data?.trial_period_days);
    console.log('Subscription trial end:', retrievedSession.subscription?.trial_end);
    console.log('Subscription status:', retrievedSession.subscription?.status);

    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/session-status
 * Get checkout session status
 */
router.get('/session-status', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      status: session.status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata
    });
  } catch (error) {
    console.error('Error retrieving session status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/create-portal-session
 * Create a Stripe Customer Portal session for billing management
 */
router.post('/create-portal-session', async (req, res) => {
  try {
    // Get user ID from headers
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get user's Stripe customer ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found. Please subscribe first.' });
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?tab=settings`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      await handleSubscriptionDeleted(deletedSubscription);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session) {
  try {
    console.log('Handling checkout completion for session:', session.id);
    const userId = session.metadata?.user_id;
    const modelId = session.metadata?.model_id;
    const selectedImageId = session.metadata?.selected_image_id;
    const planTypeFromMetadata = session.metadata?.plan_type;

    if (!userId) {
      console.error('No user_id in checkout session metadata');
      return;
    }

    console.log('Checkout metadata:', { userId, modelId, selectedImageId, planTypeFromMetadata });

    // Get subscription details
    const subscriptionId = session.subscription;
    if (!subscriptionId) {
      console.error('No subscription ID in checkout session');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    console.log('Subscription details:', { subscriptionId, priceId, status: subscription.status });

    // Determine plan type - prefer metadata, then price mapping lookup
    let planType = planTypeFromMetadata || 'base';
    if (!planType || planType === 'base') {
      if (priceId) {
        const { data: priceMapping, error: mappingError } = await supabase
          .from('stripe_price_mapping')
          .select('plan_type')
          .eq('price_id', priceId)
          .single();

        if (mappingError) {
          console.error('Error looking up price mapping:', mappingError);
        } else if (priceMapping) {
          planType = priceMapping.plan_type;
          console.log('Found plan type from price mapping:', planType);
        }
      }
    } else {
      console.log('Using plan type from metadata:', planType);
    }

    // Get current user profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, subscription_plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ CRITICAL ERROR: Failed to fetch user profile');
      console.error('User ID:', userId);
      console.error('Profile Error:', JSON.stringify(profileError, null, 2));
      return;
    }

    if (!currentProfile) {
      console.error('❌ CRITICAL ERROR: No profile found for user ID:', userId);
      return;
    }

    const currentCredits = currentProfile?.credits || 0;
    const planDetails = getPlanCredits(planType);

    console.log('✅ Checkout completed - Allocating credits');
    console.log('User Details:', {
      userId,
      planType,
      currentCredits,
      monthlyCredits: planDetails.monthlyCredits,
      newCredits: currentCredits + planDetails.monthlyCredits,
      subscriptionId,
      subscriptionStatus: subscription.status
    });

    // Update subscription plan
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: planType,
        stripe_subscription_id: subscriptionId,
        subscription_start_date: new Date().toISOString(),
        subscription_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
        credits: currentCredits + planDetails.monthlyCredits
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ CRITICAL ERROR: Failed to update user profile');
      console.error('Update Error:', JSON.stringify(updateError, null, 2));
      console.error('Attempted update data:', {
        planType,
        subscriptionId,
        creditsToAdd: planDetails.monthlyCredits,
        newTotal: currentCredits + planDetails.monthlyCredits
      });
      return;
    }

    console.log('✅ Successfully updated user profile with plan:', planType);
    console.log('✅ Credits allocated:', planDetails.monthlyCredits, '(Total:', currentCredits + planDetails.monthlyCredits, ')');

      // Record subscription history
      const { error: historyError } = await supabase
        .from('subscription_history')
        .insert({
          user_id: userId,
          plan_type: planType,
          action: 'started',
          amount_paid: planDetails.price,
          credits_allocated: planDetails.monthlyCredits
        });

      if (historyError) {
        console.error('Error recording subscription history:', historyError);
      }

      // Record credit transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'subscription',
          amount: planDetails.monthlyCredits,
          description: `Monthly credit allocation for ${planType} plan`,
          metadata: { plan: planType, monthly_credits: planDetails.monthlyCredits }
        });

      if (transactionError) {
        console.error('Error recording credit transaction:', transactionError);
      }

      // If modelId and selectedImageId are provided, finalize model creation
      if (modelId && selectedImageId) {
        const { error: modelError } = await supabase
          .from('generated_images')
          .update({ is_selected: true })
          .eq('id', selectedImageId)
          .eq('model_id', modelId);

        if (modelError) {
          console.error('Error marking image as selected:', modelError);
        } else {
          console.log('Image marked as selected for model');
        }
      }
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    console.error('Error stack:', error.stack);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;

    // Get user by Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, subscription_plan, credits')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!profile) {
      console.error('No profile found for customer:', customerId);
      return;
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    let planType = 'base';

    if (priceId) {
      const { data: priceMapping } = await supabase
        .from('stripe_price_mapping')
        .select('plan_type')
        .eq('price_id', priceId)
        .single();

      if (priceMapping) {
        planType = priceMapping.plan_type;
      }
    }

    console.log('Subscription update:', {
      userId: profile.id,
      oldPlan: profile.subscription_plan,
      newPlan: planType,
      currentCredits: profile.credits
    });

    // Get credits for the new plan
    const planDetails = getPlanCredits(planType);
    const currentCredits = profile.credits || 0;

    // Only allocate credits if this is a new subscription or upgrade
    // (subscription.status is 'active' or 'trialing')
    const shouldAllocateCredits = subscription.status === 'active' || subscription.status === 'trialing';

    let updateData = {
      subscription_plan: planType,
      stripe_subscription_id: subscription.id,
      subscription_renewal_date: new Date(subscription.current_period_end * 1000).toISOString()
    };

    if (shouldAllocateCredits) {
      updateData.credits = currentCredits + planDetails.monthlyCredits;
      console.log('Allocating credits:', {
        currentCredits,
        monthlyCredits: planDetails.monthlyCredits,
        newTotal: updateData.credits
      });
    }

    // Update subscription plan and credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return;
    }

    console.log('Successfully updated subscription for user:', profile.id);

    // Record credit transaction if credits were allocated
    if (shouldAllocateCredits) {
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: profile.id,
          transaction_type: 'subscription',
          amount: planDetails.monthlyCredits,
          description: `Monthly credit allocation for ${planType} plan`,
          metadata: { plan: planType, monthly_credits: planDetails.monthlyCredits }
        });

      if (transactionError) {
        console.error('Error recording credit transaction:', transactionError);
      }

      // Record subscription history
      const { error: historyError } = await supabase
        .from('subscription_history')
        .insert({
          user_id: profile.id,
          plan_type: planType,
          action: 'updated',
          amount_paid: planDetails.price,
          credits_allocated: planDetails.monthlyCredits
        });

      if (historyError) {
        console.error('Error recording subscription history:', historyError);
      }
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!profile) return;

    // Revert to base plan
    await supabase
      .from('profiles')
      .update({
        subscription_plan: 'base',
        stripe_subscription_id: null
      })
      .eq('id', profile.id);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Get plan credits based on plan type
 * MUST MATCH frontend pricingService.js SUBSCRIPTION_PLANS
 */
function getPlanCredits(planType) {
  const plans = {
    base: { monthlyCredits: 50, price: 9.99 },
    essential: { monthlyCredits: 250, price: 19.99 },
    ultimate: { monthlyCredits: 500, price: 29.99 }
  };
  
  // Return plan details or default to base if invalid
  if (!planType || !plans[planType]) {
    console.warn(`Invalid plan type: ${planType}, defaulting to base`);
    return plans.base;
  }
  
  return plans[planType];
}

module.exports = router;
