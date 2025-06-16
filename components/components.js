// Symbient Life Web Components
// This file contains all reusable components for the symbient.life website

// Header Component
class SymbientHeader extends HTMLElement {
  constructor() {
    super();
    this.tagline =
      this.getAttribute("tagline") ||
      "symbiosis of human and machine intelligence";
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ["tagline"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "tagline") {
      this.tagline = newValue;
      this.render();
    }
  }

  render() {
    this.innerHTML = `
            <header>
                <div class="logo glow">symbient.life</div>
                <div class="tagline">
                    ${this.tagline}<span class="cursor">█</span>
                </div>
            </header>
        `;
  }
}

// Navigation Component
class SymbientNavigation extends HTMLElement {
  constructor() {
    super();
    this.currentPage = this.getAttribute("active") || "";
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ["active"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "active") {
      this.currentPage = newValue;
      this.render();
    }
  }

  render() {
    this.innerHTML = `
            <!-- Desktop Navigation -->
            <nav class="nav">
                <div class="nav-decoration">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                </div>
                <div class="nav-container">
                    <div class="nav-grid">
                        <a href="index.html" ${this.currentPage === "definition" ? 'class="active"' : ""}>definition</a>
                        <a href="manifesto.html" ${this.currentPage === "manifesto" ? 'class="active"' : ""}>manifesto</a>
                        <a href="writings.html" ${this.currentPage === "writings" ? 'class="active"' : ""}>writings</a>
                        <a href="examples.html" ${this.currentPage === "examples" ? 'class="active"' : ""}>examples</a>
                    </div>
                </div>
                <div class="nav-decoration">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                </div>
            </nav>

            <!-- Mobile Navigation -->
            <nav class="mobile-nav">
                <div class="mobile-nav-grid">
                    <a href="index.html" ${this.currentPage === "definition" ? 'class="active"' : ""} data-icon="*">
                        definition
                    </a>
                    <a href="manifesto.html" ${this.currentPage === "manifesto" ? 'class="active"' : ""} data-icon="+">
                        manifesto
                    </a>
                    <a href="writings.html" ${this.currentPage === "writings" ? 'class="active"' : ""} data-icon="#">
                        writings
                    </a>
                    <a href="examples.html" ${this.currentPage === "examples" ? 'class="active"' : ""} data-icon="@">
                        examples
                    </a>
                </div>
            </nav>
        `;
  }
}

// Footer Component
class SymbientFooter extends HTMLElement {
  constructor() {
    super();
    this.year = this.getAttribute("year") || new Date().getFullYear();
    this.status = this.getAttribute("status") || "connection established";
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ["year", "status"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "year") {
      this.year = newValue;
      this.render();
    } else if (name === "status") {
      this.status = newValue;
      this.render();
    }
  }

  render() {
    this.innerHTML = `
            <footer class="footer">
                <div class="terminal-line">${this.status}</div>
                <p>symbient.life © ${this.year}</p>
            </footer>
        `;
  }
}

// Register all custom elements
customElements.define("symbient-header", SymbientHeader);
customElements.define("symbient-navigation", SymbientNavigation);
customElements.define("symbient-footer", SymbientFooter);

// Export for manual registration if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SymbientHeader,
    SymbientNavigation,
    SymbientFooter,
  };
}
