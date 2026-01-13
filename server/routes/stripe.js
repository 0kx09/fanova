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
    console.log('📝 Creating checkout session:', { priceId, planType, modelId, selectedImageId });
    
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

    // Determine plan type
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
    console.log('📋 Plan details:', { planType, finalPlanType, isUltimatePlan, priceId });

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
      console.log('✅ Added 1-day free trial for Ultimate plan');
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('✅ Checkout session created:', session.id);

    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
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

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    });

    res.json({
      status: session.status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
      subscription: session.subscription ? {
        id: session.subscription.id,
        status: session.subscription.status,
        current_period_end: session.subscription.current_period_end,
        trial_end: session.subscription.trial_end
      } : null
    });
  } catch (error) {
    console.error('Error retrieving session status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/process-payment-completion
 * Manually process payment completion (fallback if webhook didn't fire)
 * This is the PRIMARY method for processing payments - webhooks are unreliable
 */
router.post('/process-payment-completion', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log('🔧 Processing payment completion for session:', session_id);

    // Retrieve the session with full details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    });

    if (session.status !== 'complete') {
      return res.status(400).json({ 
        error: `Session is not complete. Current status: ${session.status}` 
      });
    }

    // Process the payment completion
    const result = await handleCheckoutCompleted(session);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to process payment',
        details: result.details
      });
    }

    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      profile: result.profile
    });
  } catch (error) {
    console.error('❌ Error processing payment completion:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process payment completion',
      details: error.stack
    });
  }
});

/**
 * POST /api/stripe/create-portal-session
 * Create a Stripe Customer Portal session for billing management
 */
router.post('/create-portal-session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

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
 * Handle Stripe webhook events (backup method)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks disabled');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('📨 Webhook: checkout.session.completed');
      await handleCheckoutCompleted(session);
      break;

    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('📨 Webhook: customer.subscription.updated');
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('📨 Webhook: customer.subscription.deleted');
      await handleSubscriptionDeleted(deletedSubscription);
      break;

    default:
      console.log(`📨 Webhook: Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Handle successful checkout - SIMPLIFIED VERSION
 * Directly allocates credits without relying on database triggers
 */
async function handleCheckoutCompleted(session) {
  try {
    console.log('🔄 Processing checkout completion for session:', session.id);
    const userId = session.metadata?.user_id;
    const modelId = session.metadata?.model_id;
    const selectedImageId = session.metadata?.selected_image_id;
    const planTypeFromMetadata = session.metadata?.plan_type;

    if (!userId) {
      const error = 'No user_id in checkout session metadata';
      console.error('❌', error);
      return { success: false, error };
    }

    console.log('📋 Checkout metadata:', { userId, modelId, selectedImageId, planTypeFromMetadata });

    // Get subscription details
    let subscriptionId;
    let subscription;
    
    if (typeof session.subscription === 'string') {
      subscriptionId = session.subscription;
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } else if (session.subscription && session.subscription.id) {
      subscription = session.subscription;
      subscriptionId = subscription.id;
    } else {
      const error = 'No subscription ID in checkout session';
      console.error('❌', error);
      return { success: false, error };
    }

    const priceId = subscription.items.data[0]?.price.id;
    const subscriptionStatus = subscription.status;

    console.log('📊 Subscription details:', { 
      subscriptionId, 
      priceId, 
      status: subscriptionStatus,
      trial_end: subscription.trial_end,
      current_period_end: subscription.current_period_end
    });

    // Determine plan type
    let planType = planTypeFromMetadata || 'base';
    if (!planType || planType === 'base') {
      if (priceId) {
        const { data: priceMapping, error: mappingError } = await supabase
          .from('stripe_price_mapping')
          .select('plan_type')
          .eq('price_id', priceId)
          .single();

        if (!mappingError && priceMapping) {
          planType = priceMapping.plan_type;
          console.log('✅ Found plan type from price mapping:', planType);
        }
      }
    }

    // Get plan details
    const planDetails = getPlanCredits(planType);
    console.log('💰 Plan details:', { planType, monthlyCredits: planDetails.monthlyCredits });

    // Get current user profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, subscription_plan, subscription_start_date, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (profileError || !currentProfile) {
      const error = `Failed to fetch user profile: ${profileError?.message || 'Profile not found'}`;
      console.error('❌', error);
      return { success: false, error };
    }

    const currentCredits = currentProfile?.credits || 0;
    const isNewSubscription = !currentProfile.subscription_start_date || !currentProfile.stripe_subscription_id;
    const newCredits = currentCredits + planDetails.monthlyCredits;

    console.log('👤 User profile:', {
      currentCredits,
      currentPlan: currentProfile.subscription_plan,
      isNewSubscription,
      willReceiveCredits: planDetails.monthlyCredits,
      newTotalCredits: newCredits
    });

    // IMPORTANT: For trialing subscriptions, we STILL allocate credits immediately
    // The user gets credits during the trial period
    const shouldAllocateCredits = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    
    if (!shouldAllocateCredits) {
      console.warn('⚠️ Subscription status is not active or trialing:', subscriptionStatus);
    }

    // Update profile with subscription and credits
    const updateData = {
      subscription_plan: planType,
      stripe_subscription_id: subscriptionId,
      subscription_start_date: new Date().toISOString(),
      subscription_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
      monthly_credits_allocated: planDetails.monthlyCredits
    };

    // Only add credits if subscription is active or trialing
    if (shouldAllocateCredits) {
      updateData.credits = newCredits;
    }

    console.log('💾 Updating profile with:', updateData);

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      const error = `Failed to update profile: ${updateError.message}`;
      console.error('❌', error);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return { success: false, error, details: updateError };
    }

    if (!updatedProfile) {
      const error = 'Profile update returned no data';
      console.error('❌', error);
      return { success: false, error };
    }

    console.log('✅ Profile updated successfully:', {
      subscription_plan: updatedProfile.subscription_plan,
      credits: updatedProfile.credits,
      monthly_credits_allocated: updatedProfile.monthly_credits_allocated,
      stripe_subscription_id: updatedProfile.stripe_subscription_id
    });

    // Record subscription history
    try {
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userId,
          plan_type: planType,
          action: isNewSubscription ? 'started' : 'updated',
          amount_paid: planDetails.price,
          credits_allocated: planDetails.monthlyCredits
        });
      console.log('✅ Subscription history recorded');
    } catch (historyError) {
      console.error('⚠️ Error recording subscription history:', historyError);
    }

    // Record credit transaction
    if (shouldAllocateCredits) {
      try {
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'subscription',
            amount: planDetails.monthlyCredits,
            description: `Monthly credit allocation for ${planType} plan${subscriptionStatus === 'trialing' ? ' (trial)' : ''}`,
            metadata: { plan: planType, monthly_credits: planDetails.monthlyCredits, subscription_status: subscriptionStatus }
          });
        console.log('✅ Credit transaction recorded');
      } catch (transactionError) {
        console.error('⚠️ Error recording credit transaction:', transactionError);
      }
    }

    // Mark selected image if provided
    if (modelId && selectedImageId) {
      try {
        await supabase
          .from('generated_images')
          .update({ is_selected: true })
          .eq('id', selectedImageId)
          .eq('model_id', modelId);
        console.log('✅ Image marked as selected');
      } catch (modelError) {
        console.error('⚠️ Error marking image as selected:', modelError);
      }
    }

    return { 
      success: true, 
      profile: updatedProfile,
      creditsAllocated: shouldAllocateCredits ? planDetails.monthlyCredits : 0
    };
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
    console.error('Error stack:', error.stack);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, subscription_plan, credits, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileError || !profile) {
      console.error('No profile found for customer:', customerId);
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

    const planDetails = getPlanCredits(planType);

    // Update subscription info (don't allocate credits on update - only on new subscriptions)
    await supabase
      .from('profiles')
      .update({
        subscription_plan: planType,
        stripe_subscription_id: subscription.id,
        subscription_renewal_date: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', profile.id);

    console.log('✅ Subscription updated for user:', profile.id);
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

    await supabase
      .from('profiles')
      .update({
        subscription_plan: 'base',
        stripe_subscription_id: null,
        subscription_start_date: null,
        subscription_renewal_date: null
      })
      .eq('id', profile.id);

    console.log('✅ Subscription cancelled for user:', profile.id);
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
  
  if (!planType || !plans[planType]) {
    console.warn(`⚠️ Invalid plan type: ${planType}, defaulting to base`);
    return plans.base;
  }
  
  return plans[planType];
}

module.exports = router;
