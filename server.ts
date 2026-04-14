import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_gKsPwFok_2hFYeK5MTJxdjbGWDSDvpTn8');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/send-stock-request", async (req, res) => {
    try {
      const { market, tmName, requestItems, currentDate } = req.body;

      const tableRows = requestItems.map((item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">${item.product.sub_brand}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.product.main_brand}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: bold; text-align: right;">${item.quantity}</td>
        </tr>
      `).join('');

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Bulk Stock Request</h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi Team,</p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">A new bulk stock request has been submitted by <strong>${tmName}</strong> for the <strong>${market}</strong> market.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 12px; background-color: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Product Name</th>
                  <th style="text-align: left; padding: 12px; background-color: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Brand</th>
                  <th style="text-align: right; padding: 12px; background-color: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">Please process this request at your earliest convenience.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Generated via StockMaster System • ${currentDate}</p>
          </div>
        </div>
      `;

      const data = await resend.emails.send({
        from: 'StockMaster <onboarding@resend.dev>',
        to: ['rumeshanjanard@gmail.com'], // Sending to the user's email so they can receive it
        subject: `📦 STOCK REQUEST: ${market} | ${tmName} | ${currentDate}`,
        html: htmlBody
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
