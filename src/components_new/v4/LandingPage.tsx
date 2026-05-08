interface LandingPageProps {
  navigate: (path: string) => void;
}

export function LandingPage({ navigate }: LandingPageProps) {
  return (
    <div className="home-landing">
      <p className="home-landing-kicker">Educational Intelligence</p>
      
      <p className="home-landing-heading">Start by uploading a document or continue from your grouped document library.</p>

      <div className="home-landing-cards">
        <button className="home-card" onClick={() => navigate("/upload")}>
          
          <span className="home-card-title">Upload a Document</span>
          <span className="home-card-desc">
            Upload a test or companion resource and run deterministic analysis.
          </span>
        </button>

        <button className="home-card" onClick={() => navigate("/documents?view=grouped")}>
          
          <span className="home-card-title">Your Documents</span>
          <span className="home-card-desc">
            Browse all documents in grouped, collapsible sections with quick counts.
          </span>
        </button>
      </div>
    </div>
  );
}
