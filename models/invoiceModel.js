import mongoose from "mongoose";
import { Schema } from "mongoose";

const invoiceSchema = new Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
  },
  plan: {
    type: String,
    required: true,
    enum: ["basic", "advance"],
  },
  invoice_date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["draft", "open", "paid", "uncollectible", "void"],
    required: true,
  },
  total_amount: { type: Number, required: true },
  pdf_url: { type: String, required: true },
  payment_status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    required: true,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

invoiceSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
