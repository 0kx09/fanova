# Identity-Locked Generation with Reference Reinjection

## Overview

This system implements **identity-locked image generation** to ensure consistent identity across multiple AI generations without relying on chat history or using generated images as references.

## Core Principles

### 1. The "Chat" is UX Only
- Every generation is a **fresh request**
- Backend **rebuilds identity from ground truth** every time
- No reliance on previous generations or chat memory

### 2. Identity Packet (Locked)
Every model has an **identity packet** that contains:
```json
{
  "persona_id": "uuid",
  "identity_prompt": "Detailed description of facial features...",
  "reference_images": ["url1", "url2", "url3"],
  "created_at": "2026-01-14T00:00:00.000Z",
  "locked": true
}
```

### 3. Reference Images are NEVER Replaced
- **Ground truth**: 2-4 original reference images
- **Never** use generated images as new references
- All generations **anchor back** to these originals
- Prevents identity drift over time

### 4. Prompt Firewall
User prompts are **filtered** to:
- **Allow**: Pose, expression, outfit, scene, lighting, camera angle
- **Block**: Face changes, age changes, ethnicity changes, identity changes

### 5. NO Chaining
- Do **NOT** use the last generated image as a reference
- Always use **original** reference images from identity packet
- This prevents slow identity corruption

## How It Works

### Generation Flow

```
User Input: "Generate her at the beach wearing a red dress"
           ↓
    ┌──────────────────┐
    │  Prompt Firewall │  ← Filters identity changes
    └──────────────────┘
           ↓
    Filtered: "at the beach wearing a red dress" ✅
           ↓
    ┌──────────────────┐
    │ Identity Packet  │  ← Loads locked identity
    └──────────────────┘
           ↓
    Identity Prompt: "A 23-year-old woman with almond-shaped brown eyes..."
    Reference Images: [original1.jpg, original2.jpg, original3.jpg]
           ↓
    ┌──────────────────┐
    │ Build Full Prompt│
    └──────────────────┘
           ↓
    SYSTEM: "You are generating images of the same person..."
    IDENTITY (LOCKED): "A 23-year-old woman with..."
    USER STYLE REQUEST: "at the beach wearing a red dress"
    INSTRUCTION: "Preserve facial structure exactly..."
           ↓
    ┌──────────────────┐
    │   AI Generation  │  ← Uses original references
    └──────────────────┘
           ↓
    Generated Images (with locked identity)
```

## Implementation

### Backend Services

#### 1. Identity Packet Service
**File**: `server/services/identityPacketService.js`

Key functions:
- `createIdentityPacket(modelId, modelData, referenceImages)` - Create locked identity
- `getIdentityPacket(modelId)` - Retrieve identity packet
- `getReferenceImages(modelId)` - Get original reference images
- `buildLockedGenerationPrompt(modelId, userPrompt)` - Build generation prompt

#### 2. Prompt Firewall Service
**File**: `server/services/promptFirewall.js`

Key functions:
- `filterPrompt(userPrompt)` - Remove identity changes
- `isPromptSafe(userPrompt)` - Check if prompt is safe
- `generateSafePrompt(userPrompt, options)` - Generate safe prompt

### API Endpoint

**POST** `/api/models/:id/generate-chat`

```javascript
{
  "userPrompt": "Generate her at a coffee shop",
  "numImages": 3,
  "isNsfw": false,
  "options": {}
}
```

Response:
```javascript
{
  "success": true,
  "images": ["url1", "url2", "url3"],
  "prompt": "Generate her at a coffee shop",
  "filteredPrompt": "at a coffee shop", // After firewall
  "fullPrompt": "SYSTEM: You are generating...", // Complete prompt
  "identityLocked": true,
  "referenceImagesUsed": 3,
  "firewallWarnings": [], // Any blocked identity changes
  "model": {
    "id": "uuid",
    "name": "Model Name",
    "generationCount": 6
  }
}
```

### Database Schema

Add to models table:
```sql
ALTER TABLE models
ADD COLUMN IF NOT EXISTS identity_packet JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_models_identity_packet
ON models USING GIN (identity_packet);
```

## Usage

### 1. Create Model with Reference Images

When creating a model:
```javascript
// Upload 2-4 reference images
const referenceImages = ['url1', 'url2', 'url3'];

// Generate initial images
POST /api/models/:id/generate
{
  "numImages": 3,
  "referenceImages": referenceImages
}
```

The system automatically creates an identity packet using the generated images.

### 2. Generate with Identity Lock

```javascript
POST /api/models/:id/generate-chat
{
  "userPrompt": "Standing in a park, wearing casual clothes",
  "numImages": 3
}
```

The system:
1. Filters the prompt (removes any identity changes)
2. Loads the identity packet
3. Builds the locked prompt with original references
4. Generates images with consistent identity

### 3. Monitor Firewall

Check logs for blocked identity changes:
```
🛡️ PROMPT FIREWALL [Model abc-123]
   Original: "Make her blonde and younger at the beach"
   Filtered: "at the beach"
   ⚠️ Blocked identity change: "blonde"
   ⚠️ Blocked identity change: "younger"
```

## Expected Results

### Identity Consistency
- **60-80%** consistency immediately (without training)
- **Near-perfect** consistency for same face, different poses
- Small variations acceptable (lighting, expression)
- **Zero drift** over long sessions

### What Can Change
✅ **Allowed**:
- Pose (standing, sitting, lying)
- Expression (smiling, serious, laughing)
- Outfit (clothes, accessories)
- Scene (beach, park, room)
- Lighting (golden hour, night, day)
- Camera (close-up, wide shot)

❌ **Blocked**:
- Face structure
- Eye color/shape
- Skin tone
- Age
- Ethnicity
- Hair color/texture (style is OK)
- Gender

## Testing

### Test Scenarios

#### 1. Basic Generation
```bash
# Should work normally
POST /api/models/:id/generate-chat
{
  "userPrompt": "Standing in a coffee shop, wearing a blue shirt"
}
```

#### 2. Identity Change (Should be Blocked)
```bash
# Firewall should filter out "blonde" and "blue eyes"
POST /api/models/:id/generate-chat
{
  "userPrompt": "Make her blonde with blue eyes at the beach"
}

# Result: "at the beach" (identity changes removed)
```

#### 3. Long Session (No Drift)
```bash
# Generate 10 times in a row
# Identity should remain consistent across all 10 generations
for i in {1..10}; do
  POST /api/models/:id/generate-chat {"userPrompt": "Different pose $i"}
done
```

## Debugging

### Check Identity Packet
```sql
SELECT identity_packet
FROM models
WHERE id = 'your-model-id';
```

### Check Firewall Logs
```bash
# Look for these in server logs:
🔒 === IDENTITY-LOCKED GENERATION ===
🛡️ PROMPT FIREWALL
✅ Identity-locked prompt built
📸 Using reference image
🎨 Generating images with identity lock...
✅ Generated 3 images with locked identity
```

### Verify Reference Images
```sql
SELECT
  id,
  name,
  identity_packet->>'reference_images' as references
FROM models
WHERE id = 'your-model-id';
```

## Troubleshooting

### Problem: Identity Still Changing

**Cause**: No identity packet or no reference images

**Solution**:
1. Check if identity_packet exists in database
2. Ensure reference images are stored
3. Verify reference images are accessible URLs

### Problem: Firewall Too Aggressive

**Cause**: Legitimate prompts being filtered

**Solution**:
1. Check `ALLOWED_KEYWORDS` in promptFirewall.js
2. Add missing allowed keywords
3. Adjust firewall strictness

### Problem: Legacy Fallback Always Used

**Cause**: Identity packet not created

**Solution**:
1. Run schema update: `schema-update-identity-packet.sql`
2. Regenerate models to create identity packets
3. Check logs for identity packet creation errors

## Future Enhancements

### 1. LoRA Training (Later)
- Train custom LoRAs for even better consistency
- Use identity packet as training data
- Combine identity lock + LoRA for 95%+ consistency

### 2. Identity Upgrade Tiers
- Basic: 2 reference images
- Premium: 4 reference images + better model
- Pro: Custom LoRA training

### 3. Multi-Identity Support
- Store multiple identity packets per model
- Switch between identities
- Blend identities (advanced)

## References

- **Prompt Firewall**: `server/services/promptFirewall.js`
- **Identity Packet**: `server/services/identityPacketService.js`
- **Generation Route**: `server/routes/models.js` (POST /:id/generate-chat)
- **Schema Update**: `server/schema-update-identity-packet.sql`

---

**Version**: 1.0
**Date**: 2026-01-14
**Status**: ✅ Implemented
