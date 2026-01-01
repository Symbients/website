(() => {
    const themes = ["light", "dark", "amber"];
    const labels = {
        light: "Light",
        dark: "Dark",
        amber: "Amber",
    };
    const storageKey = "symbient-theme";
    const root = document.documentElement;

    const getStoredTheme = () => {
        const stored = localStorage.getItem(storageKey);
        return themes.includes(stored) ? stored : null;
    };

    const getTimeBasedTheme = () => {
        const hour = new Date().getHours();
        return hour >= 18 || hour < 6 ? "dark" : "light";
    };

    const applyTheme = (theme) => {
        const normalized = themes.includes(theme) ? theme : "light";
        if (normalized === "light") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", normalized);
        }
        return normalized;
    };

    const updateToggleLabel = (toggle, theme) => {
        const label = labels[theme] || "Light";
        toggle.setAttribute("aria-label", `Theme: ${label}. Click to switch.`);
        toggle.setAttribute("title", `Theme: ${label}`);
    };

    let toggle = null;
    let hasManualPreference = false;

    const applyAutoThemeIfNeeded = () => {
        if (hasManualPreference) return;
        const applied = applyTheme(getTimeBasedTheme());
        if (toggle) updateToggleLabel(toggle, applied);
    };

    const storedTheme = getStoredTheme();
    if (storedTheme) {
        hasManualPreference = true;
        applyTheme(storedTheme);
    } else {
        applyTheme(getTimeBasedTheme());
    }

    const init = () => {
        toggle = document.querySelector(".theme-toggle");
        if (!toggle) return;

        updateToggleLabel(toggle, root.getAttribute("data-theme") || "light");

        toggle.addEventListener("click", () => {
            const active = root.getAttribute("data-theme") || "light";
            const index = themes.indexOf(active);
            const next = themes[(index + 1) % themes.length];
            const applied = applyTheme(next);
            localStorage.setItem(storageKey, applied);
            hasManualPreference = true;
            updateToggleLabel(toggle, applied);
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) applyAutoThemeIfNeeded();
        });

        window.addEventListener("focus", applyAutoThemeIfNeeded);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
