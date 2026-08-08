import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { StockSheet } from '@/types';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    color: '#111111'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    paddingBottom: 20,
    marginBottom: 20
  },
  logoContainer: {
    width: 120,
  },
  logo: {
    width: '100%',
    objectFit: 'contain'
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4
  },
  reference: {
    fontSize: 16,
    fontWeight: 900,
    color: '#E60000',
    letterSpacing: 2
  },
  statusBadge: {
    marginTop: 8,
    padding: '4 8',
    backgroundColor: '#E60000',
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  infoSection: {
    marginBottom: 30,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 4
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: '#666666',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: '#111111'
  },
  colorText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111111'
  },
  colorSwatch: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 6
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10
  },
  imageSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 350,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    marginBottom: 30,
    padding: 20
  },
  designImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  noImageText: {
    color: '#999999',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#111111',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#111111'
  },
  tableHeaderCell: {
    flex: 1,
    padding: '8 4',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 900,
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableCell: {
    flex: 1,
    padding: '12 4',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE'
  },
  tableCellTotal: {
    flex: 1,
    padding: '12 4',
    fontSize: 14,
    fontWeight: 900,
    color: '#E60000',
    textAlign: 'center',
    backgroundColor: '#FFF0F0'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },
  pageNumber: {
    fontSize: 8,
    color: '#999999',
  }
});

interface StockSheetDocumentProps {
  sheet: StockSheet;
  imageBuffers: string[]; // base64 representation of the processed images
  logoUrl: string; // URL to the public KAVON logo
  total: number;
}

export function StockSheetDocument({ sheet, imageBuffers, logoUrl, total }: StockSheetDocumentProps) {
  const SIZES = ["S", "M", "L", "XL", "XXL"];

  // Format dates explicitly in Asia/Colombo to match requirements
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const generatedTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={logoUrl} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>Kavon Stock Sheet</Text>
            <Text style={styles.reference}>{sheet.reference_number}</Text>
            {sheet.status === 'ACTIVE' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>ACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Design Name</Text>
            <Text style={styles.infoValue}>{sheet.design_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Garment Colours</Text>
            <View style={styles.colorContainer}>
              {sheet.garment_colours?.map((c, idx) => (
                <View key={idx} style={styles.colorItem}>
                  {c.hex && (
                    <View style={[styles.colorSwatch, { backgroundColor: c.hex }]} />
                  )}
                  <Text style={styles.colorText}>{c.name}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created Date</Text>
            <Text style={styles.infoValue}>{formatDate(sheet.created_at)}</Text>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{formatDate(sheet.updated_at)}</Text>
          </View>
        </View>

        {/* Image Section */}
        <View style={styles.imageSection}>
          {imageBuffers.length > 0 ? (
            <Image src={imageBuffers[0]} style={styles.designImage} />
          ) : (
            <Text style={styles.noImageText}>Design image unavailable</Text>
          )}
        </View>

        {/* Quantities Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>SIZE</Text>
            {SIZES.map(s => (
              <Text key={s} style={styles.tableHeaderCell}>{s}</Text>
            ))}
            <Text style={[styles.tableHeaderCell, { color: '#E60000' }]}>TOTAL</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { backgroundColor: '#F5F5F5', fontSize: 10 }]}>QTY</Text>
            {SIZES.map(size => (
              <Text key={size} style={styles.tableCell}>
                {sheet.quantities_map?.[size] || 0}
              </Text>
            ))}
            <Text style={[styles.tableCellTotal, { borderRightWidth: 0 }]}>{total}</Text>
          </View>
        </View>

        {/* Additional Images */}
        {imageBuffers.length > 1 && imageBuffers.slice(1).map((img, idx) => (
          <View key={idx} style={[styles.imageSection, { marginTop: 30 }]} break>
            <Image src={img} style={styles.designImage} />
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Internal Stock Management Document</Text>
          <Text style={styles.footerText}>Generated: {generatedTime}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>

      </Page>
    </Document>
  );
}
