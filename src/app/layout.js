import "./globals.css";
import "./footer.css";
import "./streaming.css";
import Footer from "@/components/footer";

export const metadata = { title: "Cinemora | Feel Every Moment", description: "A cinematic streaming experience" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Footer/></body></html>;
}
