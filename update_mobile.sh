#!/bin/bash

# Function to update mobile drawer CSS in a file
update_mobile_css() {
  local file="$1"
  
  # Check if file contains the old mobile-drawer CSS
  if grep -q "flex-direction: column;" "$file" && grep -q ".mobile-drawer {" "$file"; then
    echo "Updating $file..."
    
    # Read the file
    content=$(cat "$file")
    
    # Replace flex-direction column with row in mobile-drawer
    content=$(echo "$content" | sed 's/\.mobile-drawer {[^}]*flex-direction: column;/\.mobile-drawer {\n      display: none;\n      position: fixed;\n      top: calc(var(--menubar-h) + var(--toolbar-h));\n      left: 0; right: 0;\n      background: var(--pr-panel-bg);\n      border-top: 1px solid var(--pr-sep);\n      border-bottom: 1px solid var(--pr-sep);\n      z-index: 998;\n      flex-direction: row;/g')
    
    echo "$content" > "$file"
  fi
}

# Update all HTML files
for file in index.html marketing.html fotografia.html ia.html saiba-mais.html; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
  fi
done
