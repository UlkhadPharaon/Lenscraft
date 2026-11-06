import { Document, Paragraph, TextRun, Packer, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { VideoTreatment } from '../types';

export const exportToDocx = async (treatment: VideoTreatment) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Dossier de Production - LensCraft AI",
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 },
          }),

          // Analysis Section
          new Paragraph({ text: "1. Analyse de l'Oeuvre", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: "Description & Concept", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: treatment.analysis.description, spacing: { after: 200 } }),
          
          new Paragraph({ text: "Thème Principal", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: treatment.analysis.theme, spacing: { after: 200 } }),

          new Paragraph({ text: "Rythme & Dynamique", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: treatment.analysis.rhythm, spacing: { after: 200 } }),

          new Paragraph({ text: "Ambiance Visuelle (Vibe)", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: treatment.analysis.vibe, spacing: { after: 400 } }),

          // Script Section
          new Paragraph({ text: "2. Script & Scénario", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          ...treatment.script.split('\n').map(line => new Paragraph({ text: line, spacing: { after: 120 } })),

          // Scenes Section
          new Paragraph({ text: "3. Tableau des Scènes", heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Scène", style: "Strong" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Action & Timing", style: "Strong" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Lieu / Décor", style: "Strong" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Description", style: "Strong" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Acteurs", style: "Strong" })] }),
                ]
              }),
              ...treatment.scenes.map(scene => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: String(scene.sceneNumber) })] }),
                    new TableCell({ children: [new Paragraph({ text: scene.action })] }),
                    new TableCell({ children: [new Paragraph({ text: scene.set })] }),
                    new TableCell({ children: [new Paragraph({ text: scene.actionDescription })] }),
                    new TableCell({ children: [new Paragraph({ text: scene.actors })] }),
                  ]
                })
              )
            ]
          }),

          // ShotList Section
          ...(treatment.shotList && treatment.shotList.length > 0 ? [
            new Paragraph({ text: "4. Découpage Technique (Shot List)", heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: "Scène/Plan", style: "Strong" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Type", style: "Strong" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Mouvement", style: "Strong" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Objectif (Lens)", style: "Strong" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Durée", style: "Strong" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Description", style: "Strong" })] }),
                  ]
                }),
                ...treatment.shotList.map(shot => 
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: `${String(shot.sceneNumber).padStart(2, '0')}/${String(shot.shotNumber).padStart(2, '0')}` })] }),
                      new TableCell({ children: [new Paragraph({ text: shot.type })] }),
                      new TableCell({ children: [new Paragraph({ text: shot.cameraMovement })] }),
                      new TableCell({ children: [new Paragraph({ text: shot.lens })] }),
                      new TableCell({ children: [new Paragraph({ text: shot.duration })] }),
                      new TableCell({ children: [new Paragraph({ text: shot.description })] }),
                    ]
                  })
                )
              ]
            })
          ] : []),

          ...(treatment.production ? [
            new Paragraph({ text: `Préparation & Production`, heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
            new Paragraph({ text: `Jours de Préparation: ${treatment.production.prepDays} | Jours de Tournage: ${treatment.production.shootDays} | Jours de Post-Production: ${treatment.production.postProdDays}`, spacing: { after: 100 } }),
            ...(treatment.production.locationScouting ? [new Paragraph({ text: `Repérages et Décors :`, style: "Strong" }), new Paragraph({ text: treatment.production.locationScouting, spacing: { after: 100 } })] : []),
            ...(treatment.production.rehearsals ? [new Paragraph({ text: `Répétitions et Chorégraphie :`, style: "Strong" }), new Paragraph({ text: treatment.production.rehearsals, spacing: { after: 100 } })] : []),
            ...(treatment.production.otherPrep ? [new Paragraph({ text: `Autres Éléments :`, style: "Strong" }), new Paragraph({ text: treatment.production.otherPrep, spacing: { after: 200 } })] : []),
          ] : []),

          // Schedule Section
          ...(treatment.schedule && treatment.schedule.length > 0 ? [
            new Paragraph({ text: `Planning Détaillé du Tournage`, heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
            ...treatment.schedule.flatMap(day => [
              new Paragraph({ text: `Jour ${day.day} - ${day.location} (${day.estimatedTime})`, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
              new Paragraph({ text: `Scènes à tourner: ${day.scenesToShoot.join(', ')}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Casting requis: ${day.castNeeded.join(', ')}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Équipement spécifique: ${day.equipmentNeeded.join(', ')}`, spacing: { after: 200 } }),
            ])
          ] : []),

          // Promo Section
          ...(treatment.promoStrategy ? [
            new Paragraph({ text: `Stratégie Promotionnelle (Shorts / Reels / TikTok)`, heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
            new Paragraph({ text: `Audience Cible :`, style: "Strong", spacing: { before: 200 } }),
            new Paragraph({ text: treatment.promoStrategy.targetAudience, spacing: { after: 200 } }),
            new Paragraph({ text: `Nombre de Vidéos : ${treatment.promoStrategy.numberOfVideos}`, style: "Strong", spacing: { after: 200 } }),
            new Paragraph({ text: `Tendances et Directives :`, style: "Strong" }),
            new Paragraph({ text: treatment.promoStrategy.trendsAndIdeas, spacing: { after: 400 } }),
            ...treatment.promoStrategy.promoIdeas.flatMap((idea, i) => [
              new Paragraph({ text: `Concept #${i + 1} : ${idea.title}`, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
              new Paragraph({ text: `Concept : ${idea.concept}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Viralité estimée : ${idea.viralScore}/10 | Efficacité : ${idea.efficiencyScore}/10`, style: "Strong", spacing: { after: 100 } }),
              new Paragraph({ text: `Pourquoi ça marche : ${idea.explanation}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Script :`, style: "Strong" }),
              new Paragraph({ text: idea.script, spacing: { after: 100 } }),
              new Paragraph({ text: `Style Visuel :`, style: "Strong" }),
              new Paragraph({ text: idea.visualStyle, spacing: { after: 300 } }),
            ])
          ] : [])
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = treatment.analysis?.title ? treatment.analysis.title.replace(/[^a-z0-9]/gi, '_') : 'LensCraft';
  const fileName = `Dossier_Production_${safeTitle}.docx`;
  saveAs(blob, fileName);
};
