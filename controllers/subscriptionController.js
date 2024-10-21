import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import stripePayment from "../services/stripePayment.js";
import errorHandler from "../utils/errorHandler.js";
import Invoice from "../models/invoiceModel.js";
import stripe from "stripe";
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

export const buySubscription = async (req, res, next) => {
  try {
    const { paymentMethodId, plan, isRecurring, duration } = req.body;
    if (!paymentMethodId || !plan) {
      return next(
        new errorHandler("Payment Method and Plan are required!", 400)
      );
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new errorHandler("User not found!", 404));
    }

    let subscription = await Subscription.findOne({ userId: user._id });
    if (subscription && subscription.status === "active") {
      if (subscription.plan === plan) {
        return next(
          new errorHandler(`You already have the ${plan} plan!`, 402)
        );
      }
    }

    const customer = await stripeClient.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      payment_method: paymentMethodId,
    });

    const dirname = path.resolve();
    let date = new Date();
    date = date.toISOString().replace(/[-T:.]/g, "");

    const pdfPath = path.join(
      `${dirname}/pdfs`,
      `invoice_${user._id}-${date}.pdf`
    );

    const payment = await stripePayment(
      paymentMethodId,
      plan,
      isRecurring,
      customer.id,
      duration
    );
    if (!payment.success) {
      return next(new errorHandler("Payment failed: " + payment.message, 402));
    }
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + duration);

    if (!subscription) {
      subscription = new Subscription({
        userId: user._id,
        plan,
        status: "active",
        startDate,
        endDate,
        paymentMethod: "stripe",
        paymentStatus: "paid",
        stripeSubscriptionId: payment.transactionId,
      });
      await subscription.save();
    } else {
      subscription.plan = plan;
      subscription.status = "active";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.stripeSubscriptionId = payment.transactionId;
      await subscription.save();
    }

    user.subscription = {
      id: subscription._id,
      plan,
      expiresAt: endDate,
      status: "active",
    };
    await user.save();

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(12).text(`Invoice for Subscription Plan: ${plan}`);
    doc.text(`Customer Name: ${user.firstName} ${user.lastName}`);
    doc.text(`Customer Email: ${user.email}`);
    doc.text(`Subscription Plan: ${plan}`);
    doc.text(`Start Date: ${startDate.toDateString()}`);
    doc.text(`End Date: ${endDate.toDateString()}`);
    doc.text(
      `Total Amount: $${plan === "basic" ? 39.99 * duration : 99.99 * duration}`
    );
    doc.end();

    const invoice = new Invoice({
      customer: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: user.avatar,
      },
      invoice_date: new Date(),
      plan,
      due_date: endDate,
      status: "open",
      total_amount: plan === "basic" ? 39.99 * duration : 99.99 * duration,
      pdf_url: `/pdfs/invoice_${user._id}-${date}.pdf`,
      payment_status: "completed",
    });

    await invoice.save();

    return res.status(201).json({
      message: "Subscription created successfully and invoice generated!",
      subscription,
      invoice,
    });
  } catch (error) {
    console.error(error);
    return next(new errorHandler("Internal server error", 500));
  }
};

export const getAllInvoices = async (req, res, next) => {
  try {
    let invoice = await Invoice.find({});
    if (invoice.length === 0) {
      return next(new errorHandler("No Sales Found!", 404));
    }
    invoice = invoice.reverse();

    return res.status(200).json({
      invoices: invoice,
    });
  } catch (error) {
    return next(error);
  }
};
