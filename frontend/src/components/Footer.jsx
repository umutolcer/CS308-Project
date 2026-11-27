export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© {year} CS308 Electronics</p>
        <p>CS 308 Software Engineering project, Sabancı University</p>
      </div>
    </footer>
  );
}
