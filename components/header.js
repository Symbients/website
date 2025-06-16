class SymbientHeader extends HTMLElement {
    constructor() {
        super();
        this.tagline = this.getAttribute('tagline') || 'symbiosis of human and machine intelligence';
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['tagline'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tagline') {
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

// Register the custom element
customElements.define('symbient-header', SymbientHeader);
