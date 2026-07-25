import { useEffect, useState } from "react";
import LegalDocument from "@/components/legal/LegalDocument";

function ThaiAddress() {
  return (
    <>
      Michael Kiattanabumroong<br />
      BotflowLab.com<br />
      88/14 Phuttomonthon Sai 2 Soi 31<br />
      Sala Thammasop, Thawi Wattana<br />
      Bangkok 10170<br />
      Thailand<br />
      +66 6-3094-9914
    </>
  );
}

function UnitedStatesAddress() {
  return (
    <>
      Stephen Kinzey<br />
      SK America LLC<br />
      255 N D St, Suite 200XIX<br />
      San Bernardino, CA 92401<br />
      United States<br />
      909 644-9828
    </>
  );
}

export default function TermsOfService() {
  const [isThai, setIsThai] = useState(false);

  useEffect(() => {
    setIsThai(localStorage.getItem("rr-lang") === "th");
  }, []);

  const contactEmail = isThai ? "michael@botflowlab.com" : "steve@sk-america.com";

  return (
    <LegalDocument
      documentKey="terms"
      contactEmail={contactEmail}
      contactAddress={isThai ? <ThaiAddress /> : <UnitedStatesAddress />}
    />
  );
}
