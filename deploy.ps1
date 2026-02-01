# Deployment Script for ChiruSearch to Google Cloud Run

# Function to parse .env.local
function Get-EnvVariables {
    $envFile = ".env.local"
    if (Test-Path $envFile) {
        Write-Host "Reading variables from $envFile..."
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line.Split("=", 2)
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim()
                    # Remove quotes if present
                    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
                    elseif ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
                    
                    # Set as script-scope variable or add to a hash table
                    Set-Variable -Name $key -Value $value -Scope Script
                }
            }
        }
    }
    else {
        Write-Host "Warning: .env.local not found."
    }
}

Get-EnvVariables

# Check required variables
if (-not $GOOGLE_CLOUD_PROJECT) {
    Write-Host "Error: GOOGLE_CLOUD_PROJECT not found in .env.local"
    exit 1
}

$PROJECT_ID = $GOOGLE_CLOUD_PROJECT
$SERVICE_NAME = "chirusearch"
$REGION = "us-central1"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "=== Starting Deployment for $SERVICE_NAME to $REGION ==="
Write-Host "Project ID: $PROJECT_ID"

# 1. Build the container using Cloud Build
Write-Host "`n[1/3] Building container image..."
gcloud builds submit --tag $IMAGE_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed."
    exit 1
}

# 2. Deploy to Cloud Run
Write-Host "`n[2/3] Deploying to Cloud Run..."

# Construct environment variables string
$envVars = @(
    "GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT",
    "GOOGLE_SEARCH_API_KEY=$GOOGLE_SEARCH_API_KEY",
    "Google_Search_CX_ID=$Google_Search_CX_ID",
    "GOOGLE_SEARCH_CX_ID_ISC_PHYSICS=$GOOGLE_SEARCH_CX_ID_ISC_PHYSICS",
    "GOOGLE_SEARCH_CX_ID_ISC_ACCOUNTS=$GOOGLE_SEARCH_CX_ID_ISC_ACCOUNTS",
    "GOOGLE_SEARCH_CX_ID_ISC_COMPUTER=$GOOGLE_SEARCH_CX_ID_ISC_COMPUTER",
    "AUTH_SECRET=$AUTH_SECRET",
    "AUTH_GOOGLE_ID=$AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET=$AUTH_GOOGLE_SECRET",
    "YOUTUBE_API_KEY=$YOUTUBE_API_KEY",
    "AUTH_TRUST_HOST=true"
) -join ","

gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_TAG `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --set-env-vars $envVars

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Deployment failed."
    exit 1
}

Write-Host "`n[3/3] Deployment Complete!"
Write-Host "Get your service URL from the output above."
