import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <Link className="brand" to="/">
        <span className="brand-mark">KA</span>

        <span className="brand-text">
          <strong>Kaszinóanalitika</strong>
          <small>Játékok matematikai vizsgálata</small>
        </span>
      </Link>

      <p>Webalapú kaszinójátékok fejlesztése statisztikai elemzéssel.</p>

      <span>Szakdolgozati projekt</span>
    </footer>
  );
}

export default Footer;
