import { saveAs } from 'file-saver';
import { VideoTreatment } from '../types';

/**
 * Generates the production dossier as a PDF using @react-pdf/renderer.
 *
 * The library is imported dynamically so it lands in its own lazy chunk and
 * never bloats the initial bundle (see vite.config.ts manualChunks).
 */

const COLORS = {
  text: '#18181b',
  muted: '#52525b',
  accent: '#4f46e5',
  rule: '#d4d4d8',
  row: '#f4f4f5',
};

export async function exportToPdf(treatment: VideoTreatment): Promise<void> {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 42, fontSize: 10, fontFamily: 'Helvetica', color: COLORS.text, lineHeight: 1.5 },
    title: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: COLORS.accent },
    subtitle: { fontSize: 10, color: COLORS.muted, marginBottom: 20 },
    h1: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8, color: COLORS.accent },
    h2: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4 },
    paragraph: { marginBottom: 6, textAlign: 'justify' },
    strong: { fontFamily: 'Helvetica-Bold' },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingVertical: 4 },
    cell: { flex: 1, paddingRight: 6, fontSize: 8.5 },
    cellHead: { flex: 1, paddingRight: 6, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.muted },
    cellWide: { flex: 2, paddingRight: 6, fontSize: 8.5 },
    cellWideHead: { flex: 2, paddingRight: 6, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.muted },
    footer: { position: 'absolute', bottom: 24, left: 42, right: 42, fontSize: 8, color: COLORS.muted, textAlign: 'center' },
  });

  const safe = (value: unknown, fallback = '—') => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  };

  const Dossier = () => (
    <Document
      title={`Dossier de production — ${treatment.analysis?.title || 'LensCraft AI'}`}
      author="LensCraft AI"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Dossier de Production</Text>
        <Text style={styles.subtitle}>
          {safe(treatment.analysis?.title, 'Projet sans titre')} — généré avec LensCraft AI
        </Text>

        {/* 1. Analyse */}
        <Text style={styles.h1}>1. Analyse de l'œuvre</Text>
        <Text style={styles.h2}>Description &amp; Concept</Text>
        <Text style={styles.paragraph}>{safe(treatment.analysis?.description)}</Text>
        <Text style={styles.h2}>Thème principal</Text>
        <Text style={styles.paragraph}>{safe(treatment.analysis?.theme)}</Text>
        <Text style={styles.h2}>Rythme &amp; dynamique</Text>
        <Text style={styles.paragraph}>{safe(treatment.analysis?.rhythm)}</Text>
        <Text style={styles.h2}>Ambiance visuelle (vibe)</Text>
        <Text style={styles.paragraph}>{safe(treatment.analysis?.vibe)}</Text>

        {/* 2. Script */}
        <Text style={styles.h1}>2. Script &amp; scénario</Text>
        {(treatment.script || '').split('\n').map((line, index) => (
          <Text key={index} style={styles.paragraph}>{line || ' '}</Text>
        ))}

        {/* 3. Scènes */}
        <Text style={styles.h1}>3. Tableau des scènes</Text>
        <View style={[styles.row, { backgroundColor: COLORS.row }]}>
          <Text style={styles.cellHead}>Scène</Text>
          <Text style={styles.cellWideHead}>Action &amp; timing</Text>
          <Text style={styles.cellHead}>Lieu / décor</Text>
          <Text style={styles.cellHead}>Acteurs</Text>
        </View>
        {treatment.scenes.map((scene, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={styles.cell}>{safe(scene.sceneNumber)}</Text>
            <Text style={styles.cellWide}>{safe(scene.action)}</Text>
            <Text style={styles.cell}>{safe(scene.set)}</Text>
            <Text style={styles.cell}>{safe(scene.actors)}</Text>
          </View>
        ))}
        {treatment.scenes.length === 0 && <Text style={styles.paragraph}>Aucune scène.</Text>}

        {/* 4. Shot list */}
        {treatment.shotList && treatment.shotList.length > 0 && (
          <>
            <Text style={styles.h1}>4. Découpage technique (shot list)</Text>
            <View style={[styles.row, { backgroundColor: COLORS.row }]}>
              <Text style={styles.cellHead}>Scène/Plan</Text>
              <Text style={styles.cellHead}>Type</Text>
              <Text style={styles.cellHead}>Mouvement</Text>
              <Text style={styles.cellHead}>Objectif</Text>
              <Text style={styles.cellHead}>Durée</Text>
              <Text style={styles.cellWideHead}>Description</Text>
            </View>
            {treatment.shotList.map((shot, index) => (
              <View key={index} style={styles.row} wrap={false}>
                <Text style={styles.cell}>
                  {`${String(shot.sceneNumber).padStart(2, '0')}/${String(shot.shotNumber).padStart(2, '0')}`}
                </Text>
                <Text style={styles.cell}>{safe(shot.type)}</Text>
                <Text style={styles.cell}>{safe(shot.cameraMovement)}</Text>
                <Text style={styles.cell}>{safe(shot.lens)}</Text>
                <Text style={styles.cell}>{safe(shot.duration)}</Text>
                <Text style={styles.cellWide}>{safe(shot.description)}</Text>
              </View>
            ))}
          </>
        )}

        {/* 5. Production & planning */}
        {treatment.production && (
          <>
            <Text style={styles.h1}>5. Préparation &amp; production</Text>
            <Text style={styles.paragraph}>
              {`Jours de préparation : ${safe(treatment.production.prepDays)}  |  Jours de tournage : ${safe(
                treatment.production.shootDays,
              )}  |  Jours de post-production : ${safe(treatment.production.postProdDays)}`}
            </Text>
            <Text style={styles.h2}>Repérages et décors</Text>
            <Text style={styles.paragraph}>{safe(treatment.production.locationScouting)}</Text>
            <Text style={styles.h2}>Répétitions et chorégraphie</Text>
            <Text style={styles.paragraph}>{safe(treatment.production.rehearsals)}</Text>
            <Text style={styles.h2}>Autres éléments</Text>
            <Text style={styles.paragraph}>{safe(treatment.production.otherPrep)}</Text>
          </>
        )}

        {treatment.schedule && treatment.schedule.length > 0 && (
          <>
            <Text style={styles.h1}>6. Planning détaillé du tournage</Text>
            {treatment.schedule.map((day, index) => (
              <View key={index} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={styles.h2}>
                  {`Jour ${safe(day.day)} — ${safe(day.location)} (${safe(day.estimatedTime)})`}
                </Text>
                <Text style={styles.paragraph}>{`Scènes à tourner : ${safe(day.scenesToShoot?.join(', '))}`}</Text>
                <Text style={styles.paragraph}>{`Casting requis : ${safe(day.castNeeded?.join(', '))}`}</Text>
                <Text style={styles.paragraph}>{`Équipement spécifique : ${safe(day.equipmentNeeded?.join(', '))}`}</Text>
              </View>
            ))}
          </>
        )}

        {/* 7. Promo */}
        {treatment.promoStrategy && (
          <>
            <Text style={styles.h1}>7. Stratégie promotionnelle (Shorts / Reels / TikTok)</Text>
            <Text style={styles.h2}>Audience cible</Text>
            <Text style={styles.paragraph}>{safe(treatment.promoStrategy.targetAudience)}</Text>
            <Text style={styles.h2}>Tendances et directives</Text>
            <Text style={styles.paragraph}>{safe(treatment.promoStrategy.trendsAndIdeas)}</Text>
            {treatment.promoStrategy.promoIdeas.map((idea, index) => (
              <View key={index} style={{ marginBottom: 10 }} wrap={false}>
                <Text style={styles.h2}>{`Concept #${index + 1} : ${safe(idea.title)}`}</Text>
                <Text style={styles.paragraph}>{`Concept : ${safe(idea.concept)}`}</Text>
                <Text style={styles.paragraph}>
                  {`Viralité estimée : ${safe(idea.viralScore)}/10  |  Efficacité : ${safe(idea.efficiencyScore)}/10`}
                </Text>
                <Text style={styles.paragraph}>{`Pourquoi ça marche : ${safe(idea.explanation)}`}</Text>
                <Text style={styles.strong}>Script :</Text>
                <Text style={styles.paragraph}>{safe(idea.script)}</Text>
                <Text style={styles.strong}>Style visuel :</Text>
                <Text style={styles.paragraph}>{safe(idea.visualStyle)}</Text>
              </View>
            ))}
          </>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `LensCraft AI — page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );

  const blob = await pdf(<Dossier />).toBlob();
  const safeTitle = treatment.analysis?.title
    ? treatment.analysis.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)
    : 'LensCraft';
  saveAs(blob, `Dossier_Production_${safeTitle}.pdf`);
}
