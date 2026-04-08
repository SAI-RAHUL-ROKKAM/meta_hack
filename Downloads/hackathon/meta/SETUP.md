# 🔧 Fix: Missing Environment Variables Error

## Problem
Your `inference.py` is failing because it can't find these environment variables:
- `API_BASE_URL` - URL to your LLM API
- `MODEL_NAME` - Model identifier 
- `HF_TOKEN` - Hugging Face authentication token

## Solution

### Step 1: Create/Edit the `.env` file
A `.env` file has been created in your project root. Edit it with your actual credentials:

```bash
# Open .env in your editor and fill in:
API_BASE_URL=https://api.together.xyz/v1     # Your LLM API endpoint
MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct  # Model you want to use
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx            # Your HF token from https://huggingface.co/settings/tokens
```

### Step 2: Verify Your Setup
Run the verification script to check if everything is configured:

```bash
python verify_env.py
```

Expected output:
```
✅ .env file found
✅ API_BASE_URL: https://api.together.xyz/v1
✅ MODEL_NAME: meta-llama/...
✅ HF_TOKEN: hf_xxxx...xxxxx
✅ All dependencies installed
✅ All checks passed! Ready to run inference.py
```

### Step 3: Run Inference
Once verification passes, run your inference:

```bash
python inference.py
```

## Environment Variable Options

### API_BASE_URL (choose one):

**Option 1: Together AI** (Recommended for hackathons)
```
API_BASE_URL=https://api.together.xyz/v1
```
- Free tier available
- Sign up at: https://api.together.xyz

**Option 2: Hugging Face Inference**
```
API_BASE_URL=https://api-inference.huggingface.co/v1
```
- Use your HF token for authentication
- Limited free tier

**Option 3: Local vLLM Server** (Advanced)
```
API_BASE_URL=http://localhost:8000/v1
```
- Requires running vLLM locally
- Best for development

### MODEL_NAME (examples):
- `meta-llama/Llama-3.1-8B-Instruct` ✅ Recommended
- `meta-llama/Llama-3.2-70B-Instruct` (more powerful)
- `mistralai/Mistral-7B-Instruct-v0.3`
- `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`

### HF_TOKEN:
1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Select "Read" permission
4. Copy the token and paste in `.env`

## Common Issues

**❌ "curl: (6) Could not resolve host"**
- Check your `API_BASE_URL` is correct and accessible
- Test: `curl {API_BASE_URL}/models`

**❌ "401 Unauthorized" or "invalid_api_key"**
- Your `HF_TOKEN` is wrong or expired
- Generate a new token at https://huggingface.co/settings/tokens

**❌ "Model not found"**
- Check your `MODEL_NAME` matches the provider's available models
- Visit the provider's documentation

## How It Works

After the changes made to `inference.py`:
1. The script automatically loads variables from `.env` file (if exists)
2. Then it checks for required environment variables
3. If any are missing, it shows a helpful error message
4. If all are set, it proceeds with inference

This means you can:
- Use `.env` file (checked automatically)
- Export variables manually: `export API_BASE_URL=...`
- Mix both approaches (manual exports override `.env`)

## Quick Commands (PowerShell)

```powershell
# Edit .env file
code .env

# Verify environment
python verify_env.py

# Run inference (after .env is filled in)
python inference.py
```

## Next Steps for Phase 2

1. ✅ Fill in `.env` with your credentials
2. ✅ Run `python verify_env.py` to confirm setup
3. ✅ Run `python inference.py` to complete phase 2
4. ✅ Check `inference_results.txt` for logs an results
