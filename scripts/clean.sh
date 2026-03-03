#!/bin/bash
echo "⚠️  This will remove all containers, volumes, and data!"
read -p "Are you sure? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  docker compose down -v
  echo "✅ Cleaned up!"
else
  echo "Cancelled."
fi
