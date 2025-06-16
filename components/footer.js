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
                <p>Collaboration Monster © ${this.year}</p>
            </footer>
        `;
  }
}

// Register the custom element
customElements.define("symbient-footer", SymbientFooter);
