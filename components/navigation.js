class SymbientNavigation extends HTMLElement {
    constructor() {
        super();
        this.currentPage = this.getAttribute('active') || '';
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'active') {
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
                        <a href="index.html" ${this.currentPage === 'definition' ? 'class="active"' : ''}>definition</a>
                        <a href="manifesto.html" ${this.currentPage === 'manifesto' ? 'class="active"' : ''}>manifesto</a>
                        <a href="writings.html" ${this.currentPage === 'writings' ? 'class="active"' : ''}>writings</a>
                        <a href="examples.html" ${this.currentPage === 'examples' ? 'class="active"' : ''}>examples</a>
                    </div>
                </div>
                <div class="nav-decoration">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                </div>
            </nav>

            <!-- Mobile Navigation -->
            <nav class="mobile-nav">
                <div class="mobile-nav-grid">
                    <a href="index.html" ${this.currentPage === 'definition' ? 'class="active"' : ''}>definition</a>
                    <a href="manifesto.html" ${this.currentPage === 'manifesto' ? 'class="active"' : ''}>manifesto</a>
                    <a href="writings.html" ${this.currentPage === 'writings' ? 'class="active"' : ''}>writings</a>
                    <a href="examples.html" ${this.currentPage === 'examples' ? 'class="active"' : ''}>examples</a>
                </div>
            </nav>
        `;
    }
}

// Register the custom element
customElements.define('symbient-navigation', SymbientNavigation);
