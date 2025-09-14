export default function Impressum() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Impressum</h1>
      
      <h2 className="text-xl font-semibold mb-4">Angaben gemäß § 5 TMG</h2>
      <div className="space-y-4 mb-8">
        <p>Dennis Lach</p>
        <p>Thomasiusstraße 18</p>
        <p>04109 Leipzig</p>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
      <div className="space-y-4 mb-8">
        <p>Telefon: +49 (0) 179 2930874</p>
        <p>E-Mail: trinax@gmx.de</p>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>Dennis Lach</p>
      
      <h2 className="text-xl font-semibold mb-4 mt-8">Haftungsausschluss</h2>
      <div className="space-y-4">
        <p>Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.</p>
      </div>
    </div>
  );
}
