/* ═══════════════════════════════════════════════════════════════════════════════
   Environmental Theme Engine
   Calculates solar cycle, lunar phase, and rare celestial events to control UI theme
   ═══════════════════════════════════════════════════════════════════════════════ */

const ThemeEngine = (() => {
  // ─── Reference Data ───
  
  // Jan 11, 2024, 11:57 UTC is a known New Moon
  const KNOWN_NEW_MOON_MS = Date.UTC(2024, 0, 11, 11, 57, 0); 
  const LUNAR_CYCLE_MS = 29.53059 * 24 * 60 * 60 * 1000;

  // ─── State ───
  let currentTheme = '';
  let tickInterval = null;

  // ─── Celestial Event Definitions ───
  function checkCelestialEvents(date) {
    const m = date.getMonth() + 1; // 1-12
    const d = date.getDate();
    const y = date.getFullYear();

    // Solar Eclipses
    if ((y === 2026 && m === 8 && d === 12) || 
        (y === 2027 && m === 8 && d === 2)) {
      return 'solar_eclipse';
    }

    // Lunar Eclipses
    if ((y === 2025 && m === 3 && d === 14) || 
        (y === 2025 && m === 9 && d === 7) ||
        (y === 2026 && m === 3 && d === 3)) {
      return 'lunar_eclipse';
    }

    // Annual Meteor Showers
    if ((m === 8 && (d === 12 || d === 13)) || // Perseids
        (m === 12 && (d === 13 || d === 14)) || // Geminids
        (m === 4 && (d === 21 || d === 22))) {  // Lyrids
      return 'meteor_shower';
    }

    return null;
  }

  // ─── Lunar Math ───
  function getLunarPhase(date) {
    const elapsed = date.getTime() - KNOWN_NEW_MOON_MS;
    // Normalized position in the cycle (0.0 to 1.0)
    let cyclePos = (elapsed % LUNAR_CYCLE_MS) / LUNAR_CYCLE_MS;
    if (cyclePos < 0) cyclePos += 1;

    // Map cycle position to discrete phases (0 = new, 0.5 = full, 1.0 = new)
    if (cyclePos >= 0.95 || cyclePos < 0.05) return 'night_new_moon';
    if (cyclePos >= 0.45 && cyclePos < 0.55) return 'night_full_moon';
    if ((cyclePos >= 0.05 && cyclePos < 0.20) || (cyclePos >= 0.80 && cyclePos < 0.95)) return 'night_crescent';
    if ((cyclePos >= 0.20 && cyclePos < 0.30) || (cyclePos >= 0.70 && cyclePos < 0.80)) return 'night_quarter';
    return 'night_gibbous';
  }

  // ─── Solar Logic ───
  function evaluateTheme(testDate = null) {
    const now = testDate || new Date();
    
    // 1. Check for rare celestial overrides first
    const celestial = checkCelestialEvents(now);
    if (celestial) return celestial;

    // 2. Solar Cycle
    const hour = now.getHours() + (now.getMinutes() / 60);

    if (hour >= 5 && hour < 7) {
      return 'pre_dawn';
    } else if (hour >= 7 && hour < 9) {
      return 'sunrise';
    } else if (hour >= 9 && hour < 17) {
      return 'day'; // Default
    } else if (hour >= 17 && hour < 19) {
      return 'sunset';
    } else if (hour >= 19 && hour < 20) {
      return 'twilight';
    } else {
      // 3. Fallback to Lunar Cycle at Night (20:00 - 05:00)
      return getLunarPhase(now);
    }
  }

  // ─── Engine Cycle ───
  function applyTheme(themeName) {
    if (currentTheme !== themeName) {
      console.log(`[Theme Engine] Transitioning to: ${themeName}`);
      
      // Meteor shower requires structural animation setup
      if (themeName === 'meteor_shower') {
        ensureMeteorContainer();
      } else {
        removeMeteorContainer();
      }

      document.documentElement.setAttribute('data-theme', themeName);
      currentTheme = themeName;
    }
  }

  function tick() {
    const theme = evaluateTheme();
    applyTheme(theme);
  }

  function init() {
    tick(); // Initial evaluate
    tickInterval = setInterval(tick, 60000); // Check every minute
    console.log('[Theme Engine] Started');
  }

  // ─── Meteor Animations ───
  function ensureMeteorContainer() {
    if (!document.getElementById('meteor-container')) {
      const container = document.createElement('div');
      container.id = 'meteor-container';
      container.className = 'meteor-container';
      
      // Create 5 meteors with randomized delays
      for (let i = 0; i < 5; i++) {
        const m = document.createElement('div');
        m.className = 'meteor';
        m.style.left = Math.random() * 100 + '%';
        m.style.top = Math.random() * 50 + '%';
        m.style.animationDelay = (Math.random() * 10) + 's';
        m.style.animationDuration = (2 + Math.random() * 3) + 's';
        container.appendChild(m);
      }
      
      // Prepend to body so it sits in the background
      document.body.prepend(container);
    }
  }

  function removeMeteorContainer() {
    const container = document.getElementById('meteor-container');
    if (container) container.remove();
  }

  // ─── Public API ───
  return {
    init,
    // Expose for testing
    evaluateTheme,
    forceTheme: applyTheme
  };
})();

// Start engine on boot
document.addEventListener('DOMContentLoaded', () => {
  ThemeEngine.init();
});
