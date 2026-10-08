import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Midtrans webhook is active",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
    } = body;

    // Server Key disimpan di Environment Variable Vercel
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY belum disetting");
      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        { status: 500 }
      );
    }

    // Membuat signature yang seharusnya dikirim Midtrans
    const signatureString =
      order_id + status_code + gross_amount + serverKey;

    const expectedSignature = crypto
      .createHash("sha512")
      .update(signatureString)
      .digest("hex");

    // Verifikasi signature
    if (signature_key !== expectedSignature) {
      console.error("Invalid Midtrans signature");

      return NextResponse.json(
        {
          success: false,
          message: "Invalid signature",
        },
        { status: 401 }
      );
    }

    console.log("=== MIDTRANS NOTIFICATION ===");
    console.log("Order ID:", order_id);
    console.log("Status:", transaction_status);
    console.log("Payment:", payment_type);
    console.log("Gross Amount:", gross_amount);

    // Status pembayaran berhasil
    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      console.log("PEMBAYARAN BERHASIL:", order_id);

      // NANTI DI SINI KITA HUBUNGKAN KE DATABASE
      // lalu bot akan diberitahu bahwa order sudah LUNAS.
    }

    // Pembayaran masih menunggu
    if (transaction_status === "pending") {
      console.log("PEMBAYARAN MASIH PENDING:", order_id);
    }

    // Pembayaran gagal / dibatalkan / kedaluwarsa
    if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      console.log("PEMBAYARAN GAGAL:", order_id);
    }

    // Beri tahu Midtrans bahwa notification sudah diterima
    return NextResponse.json({
      success: true,
      received: true,
      order_id,
      transaction_status,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid request",
      },
      { status: 400 }
    );
  }
  }
