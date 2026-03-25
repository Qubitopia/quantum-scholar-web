import React from 'react';
const styles = {
    footer: {
        backgroundColor: 'var(--bg-elev)',
        color: 'var(--text)',
        padding: '1.5rem 0',
        marginTop: 'auto',
        borderTop: '1px solid var(--border)'
    },
    link: {
        color: 'var(--text)',
        marginRight: '1rem',
        textDecoration: 'none',
        opacity: 0.9
    },
    linkLast: {
        color: 'var(--text)',
        textDecoration: 'none',
        opacity: 0.9
    }
};
const Footer = () => (
    <footer style={styles.footer}>
        <div className="container">
            <div className="row">
                <div className="col-md-6">
                    <h5>Mock Project</h5>
                    <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
                </div>
                <div className="col-md-6 text-md-end">
                    <a href="/privacy" style={styles.link} className="me-3">Privacy Policy</a>
                    <a href="/terms" style={styles.linkLast}>Terms of Service</a>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
