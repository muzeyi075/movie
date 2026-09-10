import "./globals.css";
import "./footer.css";
import "./streaming.css";
import "./product.css";
import "./search.css";
import "./recommendations.css";
import "./watch-party.css";
import Footer from "@/components/footer";

export const metadata = { title: { default: "Cinemora | Feel Every Moment", template: "%s | Cinemora" }, description: "Discover and stream unforgettable films on Cinemora.", metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), openGraph: { type: "website", siteName: "Cinemora", title: "Cinemora | Feel Every Moment", description: "Discover and stream unforgettable films on Cinemora." } };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Footer/></body></html>;
}
