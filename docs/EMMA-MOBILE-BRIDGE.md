# Emma Mobile Bridge
Supabase remains Emma's source of truth, scheduler and persistent memory. The Samsung runs Emma as an installed PWA.
While the app is open/foregrounded, the bridge sends a heartbeat every 15 seconds and polls queued mobile tasks every 8 seconds.
The device identity is a random local UUID. No service-role key or master secret is shipped to the Samsung.
LIVE trading remains disabled; Binance/Freqtrade credentials stay off the mobile client.
Android may suspend background browser execution, so the Samsung is an execution edge, not the 24/7 Emma runtime. Supabase remains independent when the phone is off.
