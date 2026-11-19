import "server-only";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  StyleSheet,
} from "@react-pdf/renderer";

import {
  CERT_CONTACT_EMAIL,
  CERT_ISSUER_TITLE,
  CERT_ORGANISATION,
  CERT_REGISTERED_ADDRESS,
  dateLabel,
  monthLabel,
} from "@/lib/certificates";
import type {
  CertificateEngagement,
  CertificateType,
} from "@/lib/validation/certificate";
import { qrPath } from "./qr";

/**
 * The certificate, drawn from the database record — A4 landscape, the same design
 * as the printable HTML templates (dark panel with the QR, ivory panel with the
 * wording). Everything on the paper — number, QR, name, role, period, work line,
 * date — comes from the record, so the paper and what /verify shows can never
 * drift apart. Dimensions are written in CSS px (the templates' 1123 × 794 sheet)
 * and converted to points, so the two stay easy to compare.
 */

export interface CertificatePdfData {
  certNo: string;
  type: CertificateType;
  holderName: string;
  role: string;
  engagement: CertificateEngagement;
  startMonth: string;
  endMonth: string;
  summary: string;
  signedBy: string;
  /** null while draft: the date line stays blank for the founder to write */
  issuedOn: Date | null;
  /** from Studio → Settings → GST; omitted from the footer when blank */
  gstin: string | null;
  /** the address the QR code carries */
  verifyUrl: string;
  /** the cream wordmark PNG, or null → text fallback */
  logo: Buffer | null;
}

const INK = "#1A1714";
const IVORY = "#F2F1ED";
const GOLD = "#A88B5C";
const GOLD_D = "#7A5C2E";
const MUTED = "#5E5850";
const ONYX = "#100E0C";
const BRASS = "#C5A880";
const ON_DARK_MUTED = "#B8B1A4";
const RED = "#B23A2B";

/** CSS px → pt (the templates are 1123 × 794 px = A4 landscape at 96 dpi). */
const p = (px: number) => px * 0.75;
/** letter-spacing in em → pt for a font size given in px */
const ls = (fontPx: number, em: number) => fontPx * 0.75 * em;

const s = StyleSheet.create({
  page: { backgroundColor: IVORY, color: INK, fontFamily: "Jost" },
});

function wording(d: CertificatePdfData) {
  const isTest = d.type === "TEST";
  const title = isTest
    ? "Test Certificate"
    : d.type === "EXP"
      ? "Certificate of Experience"
      : "Certificate of Internship";
  const intro = isTest ? "This test certificate is issued to" : "This is to certify that";
  const lead = isTest
    ? "only to check the verification flow, as"
    : d.engagement === "internship"
      ? "has successfully completed an internship as"
      : d.engagement === "freelance"
        ? "has successfully completed a freelance engagement as"
        : "has worked full-time as";
  const when =
    d.startMonth === d.endMonth
      ? `in ${monthLabel(d.startMonth)}`
      : `from ${monthLabel(d.startMonth)} to ${monthLabel(d.endMonth)}`;
  const body = isTest
    ? `This document certifies nothing and must never be given to anyone as a real certificate.${d.summary ? ` ${d.summary}` : ""}`
    : `with THE RARESKIN, operated by Velocity Ventures, ${when}.${d.summary ? ` ${d.summary}` : ""}`;
  return { isTest, title, intro, lead, body };
}

/** Long names / roles step down so they never push the page past one sheet. */
function nameSize(n: string): number {
  return n.length <= 20 ? 66 : n.length <= 26 ? 54 : n.length <= 34 ? 44 : 36;
}
function roleSize(n: string): number {
  return n.length <= 28 ? 34 : n.length <= 40 ? 28 : 22;
}

function Diamond({ pos, bg }: { pos: Record<string, number>; bg?: string }) {
  return (
    <View
      style={{
        position: "absolute",
        ...pos,
        width: p(9),
        height: p(9),
        transform: "rotate(45deg)",
        borderWidth: 0.75,
        borderColor: GOLD,
        backgroundColor: bg ?? IVORY,
      }}
    />
  );
}

function Ornament({ color, line, lead }: { color: string; line: number; lead?: boolean }) {
  const dia = (
    <View
      style={{
        width: p(7),
        height: p(7),
        transform: "rotate(45deg)",
        borderWidth: 0.75,
        borderColor: color,
      }}
    />
  );
  const rule = <View style={{ width: p(line), height: 0.75, backgroundColor: color }} />;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: p(10) }}>
      {lead ? dia : rule}
      {lead ? rule : dia}
    </View>
  );
}

export function CertificateDocument({ data }: { data: CertificatePdfData }) {
  const w = wording(data);
  const { size, d: qrD } = qrPath(data.verifyUrl);
  const titles = CERT_ISSUER_TITLE.split(" · ");
  // Two lines: who issues it and how to reach it, then where (the registered address).
  const footerLines = [
    [
      "Velocity Ventures (Proprietorship)",
      data.gstin ? `GSTIN ${data.gstin}` : null,
      CERT_CONTACT_EMAIL,
      "www.therareskin.com",
    ]
      .filter(Boolean)
      .join(" · "),
    `Registered address: ${CERT_REGISTERED_ADDRESS}`,
  ];

  return (
    <Document
      title={`${w.title} — ${data.holderName} — ${data.certNo}`}
      author={CERT_ORGANISATION}
      subject={`${w.title}, ${data.certNo}`}
      keywords={`${data.certNo}, THE RARESKIN`}
      creator="THE RARESKIN Studio"
      producer="THE RARESKIN Studio"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── left panel: brand, how to verify, QR + number ───────────────── */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: p(292),
            backgroundColor: ONYX,
            paddingTop: p(48),
            paddingBottom: p(44),
            paddingHorizontal: p(36),
            justifyContent: "space-between",
          }}
        >
          <View>
            {data.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image>, no alt attribute exists
              <Image src={{ data: data.logo, format: "png" }} style={{ width: p(200), height: p(45) }} />
            ) : (
              <Text style={{ fontFamily: "Cormorant", fontWeight: 600, fontSize: p(26), letterSpacing: 4, color: "#F2F1ED" }}>
                THE RARESKIN
              </Text>
            )}
            <Text
              style={{
                marginTop: p(14),
                fontSize: p(12),
                lineHeight: 1.5,
                letterSpacing: ls(12, 0.18),
                textTransform: "uppercase",
                color: BRASS,
              }}
            >
              Operated by Velocity Ventures (Proprietorship)
            </Text>
          </View>

          <View>
            <Ornament color={BRASS} line={56} lead />
            <Text style={{ marginTop: p(16), fontSize: p(14), lineHeight: 1.65, color: ON_DARK_MUTED }}>
              This certificate can be verified online. Scan the code, or enter the certificate number at{" "}
              <Text style={{ color: IVORY }}>therareskin.com/verify</Text> to see the details on record.
            </Text>
          </View>

          <View>
            <View style={{ width: p(152), height: p(152), padding: p(16), backgroundColor: IVORY }}>
              <Svg viewBox={`0 0 ${size} ${size}`} width={p(120)} height={p(120)}>
                <Path d={qrD} fill={INK} />
              </Svg>
            </View>
            <Text
              style={{
                marginTop: p(18),
                fontSize: p(12),
                letterSpacing: ls(12, 0.2),
                textTransform: "uppercase",
                color: BRASS,
              }}
            >
              Certificate No.
            </Text>
            <Text style={{ marginTop: p(2), fontSize: p(19), letterSpacing: ls(19, 0.05), color: IVORY }}>
              {data.certNo}
            </Text>
            <Text style={{ marginTop: p(4), fontSize: p(13), color: ON_DARK_MUTED }}>therareskin.com/verify</Text>
          </View>
        </View>

        {/* ── right panel: the wording ────────────────────────────────────── */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: p(292), right: 0 }}>
          <View
            style={{
              position: "absolute",
              top: p(22),
              right: p(22),
              bottom: p(22),
              left: p(22),
              borderWidth: 0.75,
              borderColor: GOLD,
            }}
          />
          <Diamond pos={{ top: p(17), left: p(17) }} />
          <Diamond pos={{ top: p(17), right: p(17) }} />
          <Diamond pos={{ bottom: p(17), left: p(17) }} />
          <Diamond pos={{ bottom: p(17), right: p(17) }} />

          {w.isTest && (
            <Text
              style={{
                position: "absolute",
                top: p(290),
                left: p(36),
                width: p(760),
                textAlign: "center",
                transform: "rotate(-14deg)",
                fontSize: p(104),
                fontWeight: 500,
                letterSpacing: ls(104, 0.12),
                color: RED,
                opacity: 0.1,
              }}
            >
              TEST ONLY
            </Text>
          )}

          <View
            style={{
              position: "absolute",
              top: p(22),
              right: p(22),
              bottom: p(22),
              left: p(22),
              paddingTop: p(46),
              paddingHorizontal: p(52),
              paddingBottom: p(28),
              justifyContent: "space-between",
            }}
          >
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Ornament color={GOLD} line={64} lead />
                {w.isTest && (
                  <Text
                    style={{
                      paddingVertical: p(5),
                      paddingHorizontal: p(12),
                      borderWidth: 0.75,
                      borderColor: RED,
                      fontSize: p(12),
                      letterSpacing: ls(12, 0.2),
                      textTransform: "uppercase",
                      color: RED,
                    }}
                  >
                    Test document — not valid
                  </Text>
                )}
              </View>
              <Text
                style={{
                  marginTop: p(16),
                  fontFamily: "Cormorant",
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: p(54),
                  lineHeight: 1,
                }}
              >
                {w.title}
              </Text>
              <Text
                style={{
                  marginTop: p(26),
                  fontFamily: "Cormorant",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: p(21),
                  color: MUTED,
                }}
              >
                {w.intro}
              </Text>
              <Text
                style={{
                  marginTop: p(4),
                  fontFamily: "Cormorant",
                  fontWeight: 500,
                  fontSize: p(nameSize(data.holderName)),
                  lineHeight: 1.05,
                }}
              >
                {data.holderName}
              </Text>
              <View style={{ marginTop: p(12) }}>
                <Ornament color={GOLD} line={112} />
              </View>
              <Text style={{ marginTop: p(16), fontSize: p(16), lineHeight: 1.6 }}>{w.lead}</Text>
              <Text
                style={{
                  marginTop: p(2),
                  fontFamily: "Cormorant",
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: p(roleSize(data.role)),
                  lineHeight: 1.2,
                }}
              >
                {data.role}
              </Text>
              <Text style={{ marginTop: p(10), maxWidth: p(640), fontSize: p(16), lineHeight: 1.6 }}>{w.body}</Text>
            </View>

            <View style={{ gap: p(14) }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                {/* date of issue */}
                <View style={{ width: p(220) }}>
                  <View style={{ height: p(44), justifyContent: "flex-end", paddingBottom: p(3) }}>
                    {data.issuedOn && (
                      <Text style={{ width: p(220), fontWeight: 500, fontSize: p(17) }}>
                        {dateLabel(data.issuedOn)}
                      </Text>
                    )}
                  </View>
                  {/* long enough for "23rd September 2026" typed OR written by hand */}
                  <View style={{ width: p(200), height: 0.75, backgroundColor: INK }} />
                  <Text
                    style={{
                      marginTop: p(8),
                      fontSize: p(12),
                      letterSpacing: ls(12, 0.2),
                      textTransform: "uppercase",
                      color: GOLD_D,
                    }}
                  >
                    Date of issue
                  </Text>
                </View>

                {/* The company stamp is applied in ink (or as a stamp image on an e-signed
                    copy) in the clear space between the date and the signature. Nothing is
                    printed here: a "Company seal" label on a finished certificate is a
                    template placeholder, not part of the document. */}

                {/* signature */}
                <View style={{ width: p(220) }}>
                  <View style={{ height: p(44) }} />
                  <View style={{ width: p(220), height: 0.75, backgroundColor: INK }} />
                  <Text
                    style={{
                      width: p(220),
                      marginTop: p(8),
                      textAlign: "right",
                      fontFamily: "Cormorant",
                      fontWeight: 600,
                      fontSize: p(21),
                    }}
                  >
                    {data.signedBy}
                  </Text>
                  {titles.map((t) => (
                    <Text key={t} style={{ width: p(220), textAlign: "right", fontSize: p(13), lineHeight: 1.5, color: GOLD_D }}>
                      {t}
                    </Text>
                  ))}
                </View>
              </View>

              <View
                style={{
                  paddingTop: p(10),
                  borderTopWidth: 0.75,
                  borderTopColor: "#DDD6C6",
                }}
              >
                {footerLines.map((line) => (
                  <Text key={line} style={{ fontSize: p(12), lineHeight: 1.5, color: MUTED }}>
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
