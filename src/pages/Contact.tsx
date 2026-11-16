import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
          Get in Touch
        </h1>
        
        <p className="text-lg text-[#666666] mb-8 leading-relaxed">
          Have questions or need support? We're here to help. Reach out to our support team and we'll get back to you as soon as possible.
        </p>

        <div className="bg-[#1A1A1A] rounded-lg p-8 mb-8 border border-[#333333]">
          <h2 className="text-xl font-semibold mb-4">Support Email</h2>
          <a 
            href="mailto:support@nexoraos.digital"
            className="text-lg text-blue-400 hover:text-blue-300 transition-colors break-all"
          >
            support@nexoraos.digital
          </a>
        </div>

        <p className="text-sm text-[#666666] mb-8">
          We typically respond within 24 hours during business days.
        </p>

        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="border-[#333333] hover:bg-[#1A1A1A]"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default Contact;
