export function LegalPageLayout({ title, effectiveDate, lastUpdated, children }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>{title}</h1>
      <p style={{ color: 'var(--text-secondary, #aaa)', marginBottom: '16px' }}>
        <strong>Effective date:</strong> {effectiveDate} &middot; <strong>Last updated:</strong> {lastUpdated}
      </p>
      {children}
    </div>
  );
}

export function LegalSection({ heading, children }) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{heading}</h2>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }) {
  return <p style={{ lineHeight: '1.8' }}>{children}</p>;
}

export function LegalList({ children }) {
  return <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>{children}</ul>;
}
