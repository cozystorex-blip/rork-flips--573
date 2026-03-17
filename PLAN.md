# Profile navigation, consistency, and Ad Block simplification

**What was fixed**

- [x] My Profile: moved identity section (avatar, name, style tag, bio) to the top — directly under the header
- [x] Removed "What's New" promo cards from the top of My Profile
- [x] Ad Blocks now display as photo-only tiles (no titles, descriptions, badges, or actions shown)
- [x] Tapping a photo tile opens a full-screen image viewer instead of a detail modal
- [x] Long-press on own photo tiles shows delete option
- [x] Simplified Add Block flow to photo-only: removed block type, title, description, style badge, and action fields
- [x] Add Block now only requires selecting or uploading a photo
- [x] Other user profiles use the same consistent layout: avatar → name → style tag → bio → stats → photos
- [x] Discover now merges real Supabase profiles with mock profiles (real profiles shown first, no duplicates)
- [x] Back button works reliably from all profile screens with explicit headerBackTitle on all Stack.Screen options
- [x] Profile save syncs to profiles_peoples for Discover integration
- [x] All profile navigation uses correct user_id for linking

- [x] Fixed image upload "Save Failed" — uses expo-file-system/legacy for reliable native reads, with local block fallback
- [x] Discover: follow button on creator cards, followed profiles shown in horizontal avatar bubble row at top
- [x] Tab bar: centered half-floating green + button (Home | Analytics | (+) | Map | Discover), removed old corner FAB from Home

- [x] Map screen redesigned to match app design language (rounded top bar, polished filters, branded markers, consistent shadows)
- [x] AI Store Deal Insights: tapping a store marker opens a StoreDetailCard bottom sheet
- [x] StoreDetailCard shows: store info, AI deal insights (local logic), community reports with flag/report, price comparison placeholder, and actions (Log Purchase, Report Deal, Navigate)
- [x] Created services/storeInsightsService.ts for AI insight generation based on store type and category
- [x] Created mocks/storeDeals.ts with community deal report mock data
- [x] Added StoreDeal, StoreInsight, StoreType types
- [x] AI insights clearly marked as informational estimates, not guaranteed pricing
- [x] Report/flag button on each community deal post for content moderation

- [x] Forgot Password flow: link on login screen, reset password screen with email input, generic success message, loading states, email validation
- [x] AuthContext: added resetPassword and updatePassword methods using Supabase auth
- [x] Profile stats changed from log-focused (Avg/week, Total logs, Weeks) to deal-focused (Deals Found, Shoppers Helped, Stores Reported)
- [x] Discover cards updated to show deal counts instead of spend/logs
- [x] Post Deal floating bubble: small green Tag icon bubble on Home screen, opens Post Deal modal
- [x] Post Deal modal: store selector, deal title, optional price, optional description, optional photo, submit flow with success state
- [x] Post Deal route registered as modal in root layout

- [x] Scanner upgraded with dual mode: Scan Receipt + Analyze Food toggle
- [x] Food analysis mode: take photo of any food → AI identifies it → shows nutrition card (calories, macros, nutrients, health benefits, tips)
- [x] Food analysis does NOT save as expense — informational only
- [x] Created services/foodAnalysisService.ts with AI-powered food identification via generateObject
- [x] Receipt scanning flow preserved with Scan → Review → Edit → Save

- [x] Smart Scan replaces separate Analyze Food action in plus menu
- [x] Created services/smartScanService.ts — AI classifies image as food, grocery, household, furniture, or receipt
- [x] Created app/smart-scan.tsx — dedicated Smart Scan screen with camera/gallery input, animated progress, and type-specific result cards
- [x] Food results: calories, macros, fiber, sugar, nutrients, health benefits, health summary, quick tip, tags
- [x] Grocery/household results: brand, package size, price estimate, unit price, value rating, budget insight, tags
- [x] Furniture/home results: material, style, price range, value level, assembly difficulty, tools needed, mounting type, assembly summary
- [x] Smart Scan refocused to furniture/home/IKEA as primary purpose
- [x] AI prompt prioritizes furniture classification, leans toward furniture when ambiguous
- [x] Enhanced furniture schema with finish_color, estimated_dimensions, room_fit, assembly_required, estimated_build_time, people_needed, likely_parts, similar_products
- [x] Furniture result UI expanded with build time, people needed, tools with icons, parts/hardware chips, warm assembly summary card, similar products, no-assembly state
- [x] Hero section updated to furniture-first messaging, then updated to budgeting-first messaging
- [x] Capabilities list reordered: Furniture & Home (primary) then Store, Food, Receipts — updated to budgeting-first descriptions
- [x] All other scan types (food, grocery, household, receipt) remain fully functional
- [x] All scan types refocused to budgeting-first: every result answers cost, value, worth-it, and what else you may need
- [x] Food schema: added estimated_price, price_range, unit_price, value_rating, budget_insight, cheaper_alternative
- [x] Food result UI: added Price & Value section with pricing card, value rating, budget insight, cheaper alternative card
- [x] Grocery/household schema: added cheaper_alternative, what_else_needed array, total_cost_note
- [x] Grocery result UI: added cheaper alternative card, "You May Also Need" chips, total cost warning note
- [x] Furniture schema: added extra_purchase_items (item + cost + reason), total_estimated_cost, worth_it_verdict
- [x] Furniture result UI: added "What Else You May Need to Buy" list with per-item costs, total cost banner, worth-it verdict card
- [x] AI prompt rewritten as budgeting-first scanner across all types
- [x] Hero icon changed to CircleDollarSign, subtitle updated to budgeting-first messaging
- [x] Capabilities section titles and descriptions updated to emphasize cost/value/budget for each scan type
- [x] Receipt detection: auto-redirects to Receipt Scanner after brief detection message, with manual "Open Now" fallback button
- [x] Unknown items: graceful fallback with retry prompt
- [x] Plus menu updated: Scan + Profile Post (unified scan entry, removed separate Analyze Food)
- [x] log-entry.tsx cleaned to receipt-only (removed food mode toggle and food analysis UI)
- [x] Receipt Scan stays separate and unchanged
- [x] smart-scan route registered as modal in root layout
- [x] Map tab replaced with Deals feed pulling real data from Supabase public.deals table
- [x] Deals feed: newest-first cards showing store_name, title, description, category, price, savings_amount, city, created_at, source_type
- [x] Category filter chips (All, Budget, Healthy, Bulk, Deals) filter rows from public.deals
- [x] Empty state with Post Deal button when no deals exist
- [x] Post Deal now writes to Supabase deals table (was previously a mock delay)
- [x] Tab icon changed from Map to Tag icon, label changed to "Deals"
- [x] Auth persistence fixed: initialCheckDone guard prevents premature redirects during session restore
- [x] Supabase client already uses AsyncStorage with persistSession:true — no re-login needed

- [x] Deals system rebuilt with real store-brand-based deal ingestion pipeline
- [x] Created services/dealSources.ts with 8 store brand configs (Aldi, Costco, Walmart, Kroger, Trader Joe's, Whole Foods, Sprouts, Target)
- [x] Created services/dealIngestionService.ts: fetches store weekly ad pages, uses AI generateObject to extract/normalize deals (not invent), deduplicates, upserts to Supabase
- [x] AI used ONLY for normalization/extraction from real store content — never invents prices or promotions
- [x] Each verified deal includes: store_name, title, price, original_price, savings_amount, savings_percent, source_url, last_verified, brand_slug, deal_expires_at
- [x] Added VerifiedDealRow, NormalizedDeal, StoreBrandSource types
- [x] Supabase migration: added source_url, original_price, last_verified, is_verified, brand_slug, deal_expires_at, savings_percent columns to deals table
- [x] Deals screen: "Verified" filter chip, verified badges on store-brand deals, original price strikethrough, savings percent badges
- [x] Auto-sync on load (if stale > 1 hour), manual sync button, pull-to-refresh triggers sync
- [x] Verified store-brand deals sorted first, expired deals dimmed and sorted last
- [x] Web platform gracefully skips live fetch, shows cached Supabase deals only
- [x] Community user-posted deals still fully supported alongside store-brand deals
- [x] Stale deals (>2 days) auto-deactivated during sync

- [x] Deal posting restored as structured community deal posts
- [x] Plus menu updated: Scan + Post a Deal + Profile Post (unified scan entry)
- [x] Post Deal requires a real item/product photo — AI validates image before allowing post
- [x] AI auto-fills item name, brand, price, store, and category from the photo when detected
- [x] Rejected images (no product visible) show clear rejection reason and guidance
- [x] Structured deal form: store, item name, current price, original price, category, savings, city, description
- [x] Added Home and Grocery category options to deal posting
- [x] Deals tab updated with All / Verified / Community segment control
- [x] Community segment shows "Post a Deal" button in empty state and inline

- [x] Combined Verified and Community deals into one unified feed — removed segment tabs
- [x] Verified deals prioritized near top, community deals interleaved below
- [x] Deal type badges upgraded: Verified (green) and Community Find (red) badges with stronger contrast on photo overlays and inline
- [x] Inline stats strip shows Verified count + Community count + "Post Deal" button
- [x] Deal cards upgraded with stronger shadows, deeper contrast, bolder price typography, rounded corners
- [x] Savings overlay pill uses colored glow shadow for more visual pop
- [x] Analytics screen polished: stronger card shadows, bolder summary values, improved chart card hierarchy
- [x] Header bars upgraded from hairline border to soft shadow for more depth
- [x] Community deal cards show user badge, verified deals show verified badge
- [x] Deal posts linked to real signed-in user via user_id

- [x] Deal posting upgraded with stricter validation — AI confidence scoring, rejects non-deal images (selfies, scenery, random food)
- [x] Validation prompt enhanced to require store/product context, confidence threshold at 0.4
- [x] Auto-detection expanded: now also detects original price and deal type (hot_deal, clearance, bogo, weekly_ad, limited, price_drop)
- [x] Deal tags system added: Hot Deal, Clearance, BOGO, Weekly Ad, Limited Time, Price Drop with colored chips
- [x] Live savings calculator: shows real-time savings preview when both sale and original price are entered
- [x] Premium success screen: animated check with spring physics, deal preview card showing image/title/store/price
- [x] Post form upgraded: emoji category chips, "Retake" button with camera icon, better photo placeholder with "Best for deals" hint
- [x] Deal cards in Deals tab upgraded: "Community Find" badge with flame icon replaces plain "Community" label
- [x] Savings overlay on deal cards upgraded: green pill with TrendingDown icon, shadow for depth
- [x] Deal cards now tappable — opens full deal detail view with all deal info
- [x] Deal detail view (post-detail.tsx) rebuilt as proper deal viewer: large price card, savings badges, store info, metadata rows, share/source actions
- [x] Deal detail shows verified/community source type, computed savings with percentage, category pill, full timestamp
- [x] Non-deal posts (profile posts) still open in original post detail format

- [x] Verified deals now open in-app detail view first — no immediate external redirect
- [x] Verified deal detail shows "Verified Deal" hero banner with store-specific source label (e.g. "Aldi Weekly Ad", "Costco Warehouse Savings")
- [x] Freshness indicator shows when deal was last checked with color-coded pill (green/yellow/red)
- [x] "Why this deal is verified" proof card lists source, store linking, freshness, and price extraction method
- [x] Price confidence row: verified deals show "Price from store ad", community deals show "Community-reported — verify in store"
- [x] Deal expiry banner shows remaining time or expired status with color-coded styling
- [x] External store link moved to secondary action card at bottom — shows domain name and opens in browser
- [x] Community deals show amber note encouraging in-store verification
- [x] openDealDetail now passes lastVerified, brandSlug, dealExpiresAt metadata to detail screen
- [x] Brand-specific verification labels for all 8 supported stores (Aldi, Costco, Walmart, Kroger, Trader Joe's, Whole Foods, Sprouts, Target)
- [x] Share Deal is now primary action button, external link is secondary
- [x] Price disclaimer: "Prices may vary by location and availability" on all verified deals

- [x] Unified Scan: combined "Scan Receipt" and "Smart Scan" into single "Scan" plus-menu action
- [x] Scan screen auto-detects receipts vs items/food/furniture and routes to correct flow
- [x] Receipt auto-redirect: when receipt detected, auto-navigates to Receipt Scanner after 1.8s with manual override
- [x] Scan hero/title updated to reflect unified scanner messaging
- [x] Receipt Scan (log-entry.tsx) remains fully separate and unchanged

- [x] Deal trust scoring system: computeDealTrust() assigns score 0–100 based on verification, source, freshness, price data, and store matching
- [x] Trust levels: High (70+), Medium (45+), Low (20+), Unverified (<20) with distinct badge colors
- [x] Deals feed now filters out expired deals and stale unverified deals automatically
- [x] Deals sorted by trust score first, then verified status, then recency
- [x] Deal cards show trust level pill (Store Verified / Likely Accurate / Estimate) only for non-verified deals — verified deals rely on Verified badge alone
- [x] Deal detail view: verified deals show single "Verified Deal" banner with freshness pill — no redundant trust score banner
- [x] Deal detail verification proof card simplified — shows source and disclaimers only for verified high-trust deals
- [x] Stale deal warning shown in proof card when deal hasn't been checked recently
- [x] Low-trust unverified deals show amber warning encouraging in-store verification
- [x] Deal ingestion now auto-calculates savings_amount and savings_percent when missing but derivable
- [x] Expired deals filtered during ingestion — never ingested if already past expiry
- [x] Stale cleanup upgraded: deactivates expired deals by expiry date, old community deals after 72h, store deals after 48h
- [x] Community deals deactivated after 72 hours to prevent stale user-reported content

**What stays the same**

- All screens: Home, Discover, Deals (was Map), Analytics, Profile
- Profile opening from Discover cards
- Expense tracking and receipt scanning (receipt scan unchanged, food scan moved to Smart Scan)
- All navigation and routing structure
- Existing app design system and styling
- Verified deals and store-brand ingestion pipeline unchanged
- Deal cards in the feed remain unchanged
- All existing deal card tap behavior preserved

- [x] APP STORE READINESS PASS
- [x] Removed redundant trust badges: verified deals no longer show both "Verified" and "Trusted" pills simultaneously
- [x] Deal detail: consolidated verified banner and trust score banner into single clean banner per deal type
- [x] Deal detail: removed numeric trust score display (too technical for users)
- [x] External store links validated before showing — broken/invalid URLs hidden automatically
- [x] External link label changed from "View Original Store Listing" to cleaner "View Store Page"
- [x] Removed preset/demo images from profile post creation (create-block) — users must upload real photos
- [x] Profile photo grid handles missing images gracefully with placeholder icon instead of broken blank
- [x] Removed placeholder unsplash image fallback from profile block rendering
- [x] Home empty state text updated to guide users toward scanning/logging
- [x] Deals empty state text updated to feel less social, more budgeting-focused
- [x] Non-verified non-community deals show amber verification note in detail view
- [x] Freshness dots hidden for expired deals to avoid confusing signals
- [x] Build verified clean with zero TypeScript errors

- [x] SCAN HISTORY LIMIT (FREE vs PREMIUM)
- [x] Created PremiumContext: persisted premium state via AsyncStorage, upgrade/downgrade methods
- [x] Created ScanHistoryContext: persisted scan history via AsyncStorage, auto-saves successful scans (excludes receipts/unknown)
- [x] Free users: limited to 10 most recent scans in history view
- [x] Premium users: unlimited scan history access
- [x] Scan screen shows collapsible "Recent Scans" section with history entries (icon, name, type, time ago)
- [x] Tapping a history entry re-opens the scan result inline
- [x] Delete individual history entries via trash icon
- [x] When free user has hidden older scans: amber upgrade card shows count of hidden scans with upgrade CTA
- [x] Premium upgrade modal: feature list, upgrade button, dismiss option
- [x] Free limit notice shown when user is at the 10-scan cap
- [x] Both contexts wired into app layout provider tree
- [x] Build verified clean with zero TypeScript errors

---

## === SAVE 6.3 ===

All features above are complete and stable as of this checkpoint.
