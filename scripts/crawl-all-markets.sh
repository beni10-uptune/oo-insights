#!/bin/bash

# Script to crawl all Truth About Weight markets
# This triggers crawls for each market with appropriate page limits

echo "🚀 Starting comprehensive crawl for all markets..."

BASE_URL="https://oo.mindsparkdigitallabs.com"
#BASE_URL="http://localhost:3002"

# Core markets with more pages
CORE_MARKETS=("de" "fr" "it" "es" "ca_en" "ca_fr" "uk" "pl")
SECONDARY_MARKETS=("ch_de" "ch_fr" "ch_it" "se" "no" "dk" "fi" "be_nl" "be_fr" "bg" "gr" "hu" "is" "ie" "sk" "rs" "hr" "lv" "ee" "lt" "nl" "at" "pt")

echo "📊 Crawling core markets (50 pages each)..."
for market in "${CORE_MARKETS[@]}"; do
  echo "  → Crawling $market..."
  curl -X POST "$BASE_URL/api/crawl/full-website" \
    -H "Content-Type: application/json" \
    -d "{\"market\": \"$market\", \"maxPages\": 50}" \
    -s -o /dev/null
  
  # Wait 5 seconds between markets to avoid rate limiting
  sleep 5
done

echo "📊 Crawling secondary markets (25 pages each)..."
for market in "${SECONDARY_MARKETS[@]}"; do
  echo "  → Crawling $market..."
  curl -X POST "$BASE_URL/api/crawl/full-website" \
    -H "Content-Type: application/json" \
    -d "{\"market\": \"$market\", \"maxPages\": 25}" \
    -s -o /dev/null
  
  # Wait 3 seconds between markets
  sleep 3
done

echo "✅ Crawl initiated for all markets!"
echo "Check https://oo.mindsparkdigitallabs.com/web-activity for results"