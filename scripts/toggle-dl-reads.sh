#!/bin/bash
# Toggle VITE_DL_READS flag in .env.local
# Usage: ./scripts/toggle-dl-reads.sh [on|off]

ENV_FILE=".env.local"
FLAG="VITE_DL_READS"

if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE..."
  touch "$ENV_FILE"
fi

if [ "$1" == "on" ]; then
  if grep -q "^${FLAG}=" "$ENV_FILE"; then
    sed -i.bak "s/^${FLAG}=.*/${FLAG}=on/" "$ENV_FILE"
  else
    echo "${FLAG}=on" >> "$ENV_FILE"
  fi
  echo "✅ Set ${FLAG}=on"
  echo "⚠️  Restart dev server for changes to take effect"
elif [ "$1" == "off" ]; then
  if grep -q "^${FLAG}=" "$ENV_FILE"; then
    sed -i.bak "s/^${FLAG}=.*/${FLAG}=off/" "$ENV_FILE"
  else
    echo "${FLAG}=off" >> "$ENV_FILE"
  fi
  echo "✅ Set ${FLAG}=off"
  echo "⚠️  Restart dev server for changes to take effect"
else
  CURRENT=$(grep "^${FLAG}=" "$ENV_FILE" | cut -d '=' -f2 || echo "not set")
  echo "Current: ${FLAG}=${CURRENT}"
  echo "Usage: $0 [on|off]"
fi

# Clean up backup file
rm -f "${ENV_FILE}.bak"

