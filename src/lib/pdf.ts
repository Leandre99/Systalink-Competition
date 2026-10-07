import { jsPDF } from 'jspdf';
import { Passport } from '@shared/index';

export function generatePassportPDF(passport: Passport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Background
  doc.setFillColor(37, 99, 235); // #2563EB Primary Blue
  doc.rect(0, 0, 210, 45, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PASSEPORT DE COMPÉTENCES', 15, 22);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('KoraDevs + CodeFlash - CADev 2026', 15, 32);

  // User Info Card
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(passport.userName, 15, 60);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Ville : ${passport.userCity}  |  Stack : ${passport.stack.join(', ')}`, 15, 68);
  doc.text(`Bio : ${passport.bio}`, 15, 75);

  // Stats Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(239, 246, 255); // #EFF6FF Light Blue
  doc.roundedRect(15, 85, 180, 25, 3, 3, 'FD');

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${passport.points} Pts`, 25, 101);
  doc.text(`${passport.helpsCount} Aides Confirmées`, 80, 101);
  doc.text(`${passport.solutionsCount} Fiches Publiées`, 145, 101);

  // Proofs Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Preuves Vérifiables d Entraide', 15, 125);

  let y = 135;
  passport.proofs.forEach((p, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110); // #0F766E Emerald
    doc.text(`[${idx + 1}] ${p.title}`, 20, y + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${p.detail} | Hash: ${p.hash}`, 20, y + 16);

    y += 28;
  });

  // Signature Block
  doc.setDrawColor(242, 169, 59); // Amber
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, 260, 180, 22, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`SIGNÉ NUMÉRIQUEMENT PAR LE RÉSEAU KORADEVS`, 20, 269);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Empreinte : ${passport.signatureHash}  - Horodatage : ${new Date(passport.signedAt).toLocaleString('fr-FR')}`, 20, 276);

  doc.save(`Passeport-KoraDevs-${passport.userName.replace(/\s+/g, '_')}.pdf`);
}
