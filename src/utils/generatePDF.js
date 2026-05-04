import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateContributionStatement({ member, contributions, organizationName }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // -- HEADER --
  doc.setFontSize(20);
  doc.setTextColor(90, 196, 153); // orange
  doc.setFont('helvetica', 'bold');
  doc.text('Thriftly', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(organizationName, 14, 27);

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('Contribution Statement', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date Issued: ${today}`, pageWidth - 14, 20, { align: 'right' });

  // divider
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 32, pageWidth - 14, 32);

  // -- MEMBER INFO --
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('Member Information', 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const info = [
    ['Full Name', member.user?.full_name ?? '—'],
    ['Email', member.user?.email ?? '—'],
    ['Phone', member.user?.phone ?? '—'],
    ['KYC Status', member.user?.kyc_status ?? '—'],
    ['Role', member.role ?? '—'],
    ['Member Since', member.join_date ? new Date(member.join_date).toLocaleDateString('en-GB') : '—'],
  ];

  info.forEach(([label, value], i) => {
    const y = 50 + i * 7;
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 14, y);
    doc.setTextColor(30, 30, 30);
    doc.text(value, 60, y);
  });

  // -- SUMMARY --
  const totalDue = contributions.reduce((sum, c) => sum + parseFloat(c.amount_due ?? 0), 0);
  const totalPaid = contributions.reduce((sum, c) => sum + parseFloat(c.amount_paid ?? 0), 0);
  const compliance = totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : '0';
  const outstanding = totalDue - totalPaid;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('Contribution Summary', 14, 100);

  autoTable(doc, {
    startY: 105,
    head: [['Total Expected', 'Total Paid', 'Outstanding', 'Compliance Rate']],
    body: [[
      `£${totalDue.toLocaleString()}`,
      `£${totalPaid.toLocaleString()}`,
      `£${outstanding.toLocaleString()}`,
      `${compliance}%`,
    ]],
    headStyles: { fillColor: [90, 196, 153], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // -- CONTRIBUTION HISTORY --
  const historyStartY = doc.lastAutoTable.finalY + 12;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('Contribution History', 14, historyStartY);

  const rows = contributions.map(c => [
    c.cycle?.thrift_group?.name ?? '—',
    c.cycle ? `#${c.cycle.cycle_number}` : '—',
    c.cycle?.start_date ? new Date(c.cycle.start_date).toLocaleDateString('en-GB') : '—',
    `£${Number(c.amount_due).toLocaleString()}`,
    `£${Number(c.amount_paid).toLocaleString()}`,
    c.payment_date ? new Date(c.payment_date).toLocaleDateString('en-GB') : '—',
    c.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: historyStartY + 5,
    head: [['Group', 'Cycle', 'Period Start', 'Amount Due', 'Amount Paid', 'Date Paid', 'Status']],
    body: rows,
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const status = data.cell.raw;
        if (status === 'PAID') data.cell.styles.textColor = [22, 163, 74];
        else if (status === 'DEFAULTED') data.cell.styles.textColor = [220, 38, 38];
        else if (status === 'PENDING') data.cell.styles.textColor = [217, 119, 6];
      }
    },
  });

  // -- STAMP --
  const stampY = doc.lastAutoTable.finalY + 20;
  const stampX = pageWidth / 2;

  doc.setDrawColor(90, 196, 153);
  doc.setLineWidth(0.8);
  doc.roundedRect(stampX - 60, stampY - 8, 120, 22, 3, 3);

  doc.setFontSize(8);
  doc.setTextColor(90, 196, 153);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED BY THRIFTLY', stampX, stampY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`On behalf of ${organizationName} — ${today}`, stampX, stampY + 6, { align: 'center' });

  // -- FOOTER --
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${organizationName} | Powered by Thriftly | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // -- SAVE --
  const fileName = `contribution-statement-${member.user?.full_name?.replace(/\s+/g, '-').toLowerCase()}-${today.replace(/\s/g, '-')}.pdf`;
  doc.save(fileName);
}
