export default function Datenschutz() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>
      
      <h2 className="text-xl font-semibold mb-4">1. Datenschutz auf einen Blick</h2>
      <div className="space-y-4 mb-8">
        <p>Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten auf unserer Website auf.</p>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">2. Hosting</h2>
      <div className="space-y-4 mb-8">
        <p>Unser Hoster erhebt in sog. Logfiles folgende Daten, die Ihr Browser übermittelt:</p>
        <ul className="list-disc pl-5">
          <li>IP-Adresse</li>
          <li>Datum und Uhrzeit der Anfrage</li>
          <li>Verwendete Browser und Betriebssystem</li>
        </ul>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">3. Kontaktformular</h2>
      <p>Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben inklusive der von Ihnen angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage bei uns gespeichert.</p>
      
      <h2 className="text-xl font-semibold mb-4 mt-8">4. Ihre Rechte</h2>
      <div className="space-y-4">
        <p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung oder Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.</p>
      </div>
    </div>
  );
}
