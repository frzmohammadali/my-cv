# File Versioning Script with Timestamp Hash
# This script renames style.css, script.js, and lang-res.js files with version hashes
# and updates the references in index.html

# Configuration
$filesToVersion = @(
    @{ OldName = "style.css"; SearchPattern = "style-*.css" }
    @{ OldName = "script.js"; SearchPattern = "script-*.js" }
    @{ OldName = "lang-res.js"; SearchPattern = "lang-res-*.js" }
)

$indexFile = "index.html"

# Function to generate short hash from timestamp
function Get-TimestampHash {
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $hash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($timestamp)))
    $hash = $hash.Replace("-", "").ToLower()
    return $hash.Substring(0, 10)  # Take first 10 characters for shorter hash
}

# Function to backup original files
function Backup-Files {
    Write-Host "Creating backups..." -ForegroundColor Yellow
    
    foreach ($file in $filesToVersion) {
        $oldName = $file.OldName
        if (Test-Path $oldName) {
            $backupName = "$oldName.backup"
            if (Test-Path $backupName) {
                Remove-Item $backupName -Force
            }
            Copy-Item $oldName $backupName
            Write-Host "  Backed up $oldName to $backupName" -ForegroundColor Green
        }
    }
    
    if (Test-Path $indexFile) {
        $indexBackup = "$indexFile.backup"
        if (Test-Path $indexBackup) {
            Remove-Item $indexBackup -Force
        }
        Copy-Item $indexFile $indexBackup
        Write-Host "  Backed up $indexFile to $indexBackup" -ForegroundColor Green
    }
}

# Function to clean up old versioned files
function Remove-OldVersionedFiles {
    Write-Host "Cleaning up old versioned files..." -ForegroundColor Yellow
    
    foreach ($file in $filesToVersion) {
        $pattern = $file.SearchPattern
        $oldFiles = Get-ChildItem -Path . -Filter $pattern | Where-Object { $_.Name -ne $file.OldName }
        
        foreach ($oldFile in $oldFiles) {
            Remove-Item $oldFile.FullName -Force
            Write-Host "  Removed old file: $($oldFile.Name)" -ForegroundColor Gray
        }
    }
}

# Function to version files and update references
function Update-FileVersions {
    $timestampHash = Get-TimestampHash
    Write-Host "Generated timestamp hash: $timestampHash" -ForegroundColor Cyan
    
    $versionMappings = @{}
    
    # Rename files with version hash
    foreach ($file in $filesToVersion) {
        $oldName = $file.OldName
        $fileExtension = [System.IO.Path]::GetExtension($oldName)
        $fileNameWithoutExtension = [System.IO.Path]::GetFileNameWithoutExtension($oldName)
        $newName = "${fileNameWithoutExtension}-${timestampHash}${fileExtension}"
        
        if (Test-Path $oldName) {
            # Store the mapping for reference updates
            $versionMappings[$oldName] = $newName
            
            # Rename the file
            Rename-Item $oldName $newName -Force
            Write-Host "  Renamed $oldName to $newName" -ForegroundColor Green
        }
        else {
            Write-Host "  Warning: $oldName not found" -ForegroundColor Yellow
        }
    }
    
    # Update references in index.html
    if (Test-Path $indexFile) {
        $content = Get-Content $indexFile -Raw
        
        foreach ($mapping in $versionMappings.GetEnumerator()) {
            $oldFile = $mapping.Key
            $newFile = $mapping.Value
            
            # Replace references in various HTML attribute formats
            $patterns = @(
                "`"$oldFile`"",
                "'$oldFile'",
                "`($oldFile`)",
                "href=`"$oldFile`"",
                "src=`"$oldFile`""
            )
            
            foreach ($pattern in $patterns) {
                $newPattern = $pattern.Replace($oldFile, $newFile)
                $content = $content -replace [regex]::Escape($pattern), $newPattern
            }
            
            Write-Host "  Updated references from $oldFile to $newFile" -ForegroundColor Blue
        }
        
        # Save the updated content
        $content | Set-Content $indexFile -Encoding UTF8
        Write-Host "  Updated $indexFile with new file references" -ForegroundColor Green
    }
    else {
        Write-Host "  Error: $indexFile not found" -ForegroundColor Red
    }
    
    return $versionMappings
}

# Function to display summary
function Show-Summary {
    param($versionMappings)
    
    Write-Host "`nVersioning Summary:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    foreach ($mapping in $versionMappings.GetEnumerator()) {
        Write-Host "  $($mapping.Key) -> $($mapping.Value)" -ForegroundColor White
    }
    
    Write-Host "`nAll files have been successfully versioned!" -ForegroundColor Green
    Write-Host "Backup files (.backup) have been created for safety." -ForegroundColor Yellow
}

# Main execution
try {
    Write-Host "Starting file versioning process..." -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    
    # Step 1: Create backups
    Backup-Files
    
    # Step 2: Clean up old versioned files
    Remove-OldVersionedFiles
    
    # Step 3: Update file versions and references
    $versionMappings = Update-FileVersions
    
    # Step 4: Show summary
    Show-Summary -versionMappings $versionMappings
    
}
catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Script execution failed." -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")