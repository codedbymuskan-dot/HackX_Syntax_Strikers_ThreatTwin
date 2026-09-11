import { jsPDF } from 'jspdf';

export function exportIncidentReport({
  selectedScenario,
  footholdNodeId,
  attackPaths,
  activeControls,
  securityScore,
  network,
  appliedDrifts,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const nodeMap = {};
  if (network && network.nodes) {
    network.nodes.forEach((n) => (nodeMap[n.id] = n));
  }

  // Dark header block
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, 210, 42, 'F');

  // Title
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('THREATWIN // SECURITY DIGITAL TWIN', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Threat Vector & Blast Radius Assessment Report', 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()} (Offline Digital Twin)`, 14, 32);

  // Executive Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 48, 182, 36, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE POSTURE SUMMARY', 20, 56);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const scenarioName = selectedScenario?.label || footholdNodeId || 'Custom Foothold';
  doc.text(`Simulated Compromise Foothold:`, 20, 64);
  doc.setFont('helvetica', 'bold');
  doc.text(`${scenarioName} (${footholdNodeId || 'N/A'})`, 80, 64);

  doc.setFont('helvetica', 'normal');
  doc.text(`Security Posture Score:`, 20, 71);
  doc.setFont('helvetica', 'bold');
  const scoreVal = securityScore ? `${securityScore.score} / 100 (${securityScore.status})` : 'N/A';
  doc.text(scoreVal, 80, 71);

  doc.setFont('helvetica', 'normal');
  doc.text(`Active Security Controls:`, 20, 78);
  doc.setFont('helvetica', 'bold');
  const controlsText = activeControls.length > 0 ? activeControls.join(', ') : 'None (Baseline Exposure)';
  doc.text(controlsText, 80, 78);

  // Ranked Attack Chains
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Ranked Discovered Attack Vectors (${attackPaths.length})`, 14, 94);

  let y = 102;

  if (attackPaths.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(34, 197, 94);
    doc.text('No attack chains to critical assets were discovered under current defensive controls.', 14, y);
    y += 15;
  } else {
    attackPaths.forEach((chain, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(`#${idx + 1} Target: ${chain.targetLabel}`, 20, y + 7);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Hops: ${chain.hopCount}   |   Risk Score: ${chain.riskScore}`, 120, y + 7);

      const pathLabels = chain.path.map((id) => nodeMap[id]?.label || id);
      const pathString = pathLabels.join(' -> ');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitPath = doc.splitTextToSize(pathString, 170);
      doc.text(splitPath, 20, y + 14);

      y += 33;
    });
  }

  // Environmental Drift audit if any
  if (appliedDrifts && appliedDrifts.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Continuous Synchronization // Applied Drifts (${appliedDrifts.length})`, 14, y);
    y += 7;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Drift events detected & integrated: ${appliedDrifts.join(', ')}`, 14, y);
  }

  // Save PDF client-side
  doc.save('ThreatTwin-Security-Assessment-Report.pdf');
}
