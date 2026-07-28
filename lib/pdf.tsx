import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Sale, Customer } from "@/types";
import { formatPaisaAsPKR } from "./currency";
import { formatDate } from "./dates";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0f766e",
    paddingBottom: 15,
    marginBottom: 20,
  },
  companyTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
  },
  companySubtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#0f766e",
  },
  invoiceNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 4,
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  colProduct: { width: "40%" },
  colSku: { width: "20%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },

  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  totalsTable: {
    width: "45%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 2,
    borderColor: "#0f766e",
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#0f766e",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
});

interface InvoicePdfProps {
  sale: Sale;
  customer: Customer;
}

export const InvoiceDocument: React.FC<InvoicePdfProps> = ({ sale, customer }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyTitle}>Aiza Heels</Text>
          <Text style={styles.companySubtitle}>
            Premium Women's Heel Manufacturing & Distribution
          </Text>
        </View>
        <View>
          <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
          <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
          <Text style={{ fontSize: 9, color: "#64748b", textAlign: "right", marginTop: 2 }}>
            Date: {formatDate(sale.createdAt)}
          </Text>
        </View>
      </View>

      {/* Bill To */}
      <View style={styles.twoColumn}>
        <View style={{ width: "50%" }}>
          <Text style={styles.sectionTitle}>Billed To:</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 }}>
            {customer.name}
          </Text>
          <Text style={{ color: "#475569" }}>Phone: {customer.phone}</Text>
          {customer.address && <Text style={{ color: "#475569" }}>Address: {customer.address}</Text>}
        </View>
        <View style={{ width: "40%", textAlign: "right" }}>
          <Text style={styles.sectionTitle}>Payment Terms:</Text>
          <Text style={{ color: "#475569" }}>Method: {sale.paymentMethod.toUpperCase()}</Text>
          <Text style={{ color: "#475569" }}>Status: {sale.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colProduct}>Product Description</Text>
          <Text style={styles.colSku}>SKU / Variant</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit Price</Text>
          <Text style={styles.colTotal}>Total (PKR)</Text>
        </View>
        {sale.items.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.colProduct}>{item.productName}</Text>
            <Text style={styles.colSku}>
              {item.variantSku} ({item.size}/{item.color})
            </Text>
            <Text style={styles.colQty}>{item.qty}</Text>
            <Text style={styles.colPrice}>{formatPaisaAsPKR(item.unitPrice)}</Text>
            <Text style={styles.colTotal}>{formatPaisaAsPKR(item.lineTotal)}</Text>
          </View>
        ))}
      </View>

      {/* Totals Section */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsTable}>
          <View style={styles.totalsRow}>
            <Text style={{ color: "#64748b" }}>Subtotal:</Text>
            <Text>{formatPaisaAsPKR(sale.subtotal)}</Text>
          </View>
          {sale.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={{ color: "#64748b" }}>Discount:</Text>
              <Text>- {formatPaisaAsPKR(sale.discount)}</Text>
            </View>
          )}
          {sale.tax > 0 && (
            <View style={styles.totalsRow}>
              <Text style={{ color: "#64748b" }}>Tax:</Text>
              <Text>+ {formatPaisaAsPKR(sale.tax)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text>Grand Total:</Text>
            <Text>{formatPaisaAsPKR(sale.grandTotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={{ color: "#64748b" }}>Paid Amount:</Text>
            <Text>{formatPaisaAsPKR(sale.paidAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={{ color: "#b91c1c", fontFamily: "Helvetica-Bold" }}>
              Remaining Balance:
            </Text>
            <Text style={{ color: "#b91c1c", fontFamily: "Helvetica-Bold" }}>
              {formatPaisaAsPKR(sale.remainingAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Thank you for doing business with Aiza Heels!</Text>
        <Text style={{ marginTop: 2 }}>Computer generated invoice. No signature required.</Text>
      </View>
    </Page>
  </Document>
);

/**
 * Generate a PDF Buffer from a Sale document.
 */
export async function generateInvoicePdfBuffer(
  sale: Sale,
  customer: Customer
): Promise<Buffer> {
  const doc = <InvoiceDocument sale={sale} customer={customer} />;
  const pdfStream = await pdf(doc).toBuffer();
  return pdfStream as unknown as Buffer;
}
