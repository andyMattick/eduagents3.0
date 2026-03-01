import "./inference.css";


export default function WhatWeInfer() {

  return (
    <div className="inference-page">

      <h1 style={{ marginBottom: "24px" }}>How Your Inputs Drive the Process</h1>

      {/* ------------------------------
          COLLAPSIBLE: WRITING TESTS
      ------------------------------ */}
            <span className="arrow">▶</span>
            When Writing Assessments


          <div className="inference-grid">
            {/* Course */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Course Name</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Tells the system what subject you teach and helps it pick the right kind of questions.</li>
                <li>• Shapes how challenging and complex the questions will be.</li>
                <li>• AP courses get questions that look and feel like AP exam free-response questions.</li>
              </ul>
            </div>

            {/* Unit */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Unit / Topic</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Tells the system what concepts, skills, and vocabulary students should know.</li>
                <li>• Guides what types of questions to write and how deeply students need to think.</li>
                <li>• Helps surface common misconceptions tied to this topic.</li>
              </ul>
            </div>

            {/* Student Level */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Student Level</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Adjusts how hard the questions are and how much support is built into the wording.</li>
                <li>• Sets how much independent thinking is expected versus step-by-step guidance.</li>
                <li>• AP levels get questions written to match AP exam expectations.</li>
              </ul>
            </div>

            {/* Assignment Type */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Assignment Type</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Shapes how many questions to write, what format they take, and how long each one should be.</li>
                <li>• Determines whether this is a quick check-in or a full summative assessment.</li>
                <li>• Adjusts how much thinking is expected based on the type.</li>
              </ul>
            </div>

            {/* Time */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Time</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Helps the system figure out how many questions will fit in the time you have.</li>
                <li>• Decides whether there&#39;s room for multi-part or extended questions.</li>
                <li>• Keeps the assessment realistic — questions are scoped to what students can actually finish.</li>
              </ul>
            </div>

            {/* Uploads */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Uploads</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Reads your materials to understand what you&#39;ve already taught.</li>
                <li>• Matches the tone and format of any example tests you share.</li>
                <li>• Makes sure questions only cover what was actually in your content.</li>
                <li>• Keeps questions grounded in what students have seen.</li>
              </ul>
            </div>

            {/* Comments */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Additional Comments</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Lets you add specific instructions, focus areas, or things to avoid.</li>
                <li>• Gives you direct control over how deep the questions go.</li>
                <li>• Overrides any automatic decisions the system would have made.</li>
              </ul>
            </div>
          </div>

      {/* ------------------------------
          COLLAPSIBLE: GENERATING STUDENTS
      ------------------------------ */}
            <span className="arrow">▶</span>
            When Generating Students

          <div className="inference-grid">
            {/* Grade Band */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Grade Band</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Sets the starting point for how well students in this grade can read, reason, and stay focused.</li>
                <li>• Determines how much difficulty or confusion a typical student can handle.</li>
              </ul>
            </div>

            {/* Class Level */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Class Level</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Adjusts how capable the simulated students are overall.</li>
                <li>• Honors and AP students are modeled as stronger readers and more independent thinkers.</li>
              </ul>
            </div>

            {/* Subject */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Subject</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Boosts the skills that matter most for your subject — like math fluency or reading comprehension.</li>
                <li>• Shapes which student traits have the biggest impact during simulation.</li>
              </ul>
            </div>

            {/* Overlays */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Overlays</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Adds learning needs to the simulated students (ADHD, dyslexia, English learners, test anxiety).</li>
                <li>• Adjusts how those students handle focus, reading, complex directions, and confidence.</li>
              </ul>
            </div>

            {/* Base Stats */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Base Stats</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Builds each student&#39;s reading level, reasoning ability, and math fluency.</li>
                <li>• Combines the grade band, class level, and any learning need overlays you selected.</li>
              </ul>
            </div>

            {/* Simulation Behavior */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Simulation Behavior</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Predicts how well each student will do, how long they&#39;ll take, and where they&#39;ll get stuck.</li>
                <li>• Flags students who are at risk of running out of time or disengaging.</li>
              </ul>
            </div>

            {/* Scoring Rules */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Scoring Rules</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Controls how all the student stats are calculated.</li>
                <li>• Ensures the simulated students behave like real students, not averages.</li>
              </ul>
            </div>
          </div>


      {/* ============================================================
          3. WHAT EACH INPUT DOES
      ============================================================ */}
          <span className="arrow">▶</span>
          What Each Input Does
          <div className="inference-grid">
            {/* Grade Levels */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Grade Levels</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Adjusts vocabulary, reading load, and the kinds of real-world examples used.</li>
                <li>• Helps the system avoid questions that are too advanced or too easy for your students.</li>
              </ul>
            </div>

            {/* Course */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Course</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Establishes the subject area and the standards that apply.</li>
                <li>• Guides the terminology and types of representations used in questions.</li>
              </ul>
            </div>

            {/* Unit */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Unit / Topic</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Defines exactly what concepts, skills, and vocabulary the questions should cover.</li>
                <li>• Keeps questions focused on what was taught — not tangentially related material.</li>
              </ul>
            </div>

            {/* Student Level */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Student Level</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Adjusts how much support is built into each question and how abstract the thinking needs to be.</li>
                <li>• Determines whether students are guided step-by-step or expected to figure things out independently.</li>
              </ul>
            </div>

            {/* Assessment Type */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Assessment Type</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Determines the structure, pacing, and mix of question types.</li>
                <li>• Sets the overall expectations — quick check-in, unit test, or cumulative review.</li>
              </ul>
            </div>

            {/* Time */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Time</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Sets how many questions to include and how much depth each one can have.</li>
                <li>• Prevents the assessment from being longer than students can actually finish.</li>
              </ul>
            </div>

            {/* Source Documents */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Source Documents</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Read to understand what you've actually taught, so questions don't go off-script.</li>
                <li>• Pulls out key vocabulary, concepts, and examples directly from your materials.</li>
                <li>• Prevents the system from making up content that wasn't in your lessons.</li>
                <li>• You can upload multiple files.</li>
              </ul>
            </div>

            {/* Example Tests */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Example Tests</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Teaches the system your preferred question style, tone, and format.</li>
                <li>• Helps it match the difficulty and structure of tests you've written before.</li>
                <li>• You can upload files or paste text directly.</li>
              </ul>
            </div>

            {/* Additional Details */}
            <div className="inference-card">
              <div className="inference-card-header">
                <strong>Additional Details</strong>
              </div>
              <ul className="inference-card-text">
                <li>• Lets your specific instructions take priority over automatic decisions.</li>
                <li>• Adds constraints, misconceptions, or “avoid this” rules.</li>
                <li>• Makes the assessment feel like yours, not a generic template.</li>
              </ul>
            </div>
          </div>
      
      {/* ============================================================
    4. WHO OUR AGENTS ARE
============================================================ */}
{/* ============================================================
    4. WHO OUR AGENTS ARE
============================================================ */}
    <span className="arrow">▶</span>
    Who Our Agents Are (and How You Drive the Process)
    <div className="inference-grid">

      {/* Interpreter */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Interpreter</strong></div>
        <ul className="inference-card-text">
          <li>• Reads everything you filled in — your topic, uploads, notes, and examples.</li>
          <li>• Summarizes what you’re teaching and what matters most.</li>
          <li>• Flags anything you said should be required, avoided, or emphasized.</li>
        </ul>
      </div>

      {/* Designer */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Designer</strong></div>
        <ul className="inference-card-text">
          <li>• Builds the overall plan for the assessment — before any questions are written.</li>
          <li>• Decides what types of questions to include, how hard they should be, and how to pace them.</li>
          <li>• Makes sure the plan fits your time, student level, and standards.</li>
        </ul>
      </div>

      {/* Test Builder */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Test Builder</strong></div>
        <ul className="inference-card-text">
          <li>• Turns the Designer's plan into a clear structure the Writer can follow.</li>
          <li>• Lays out each question slot with its format, focus, and difficulty level.</li>
          <li>• Makes sure the Writer stays on track and doesn't go off-script.</li>
        </ul>
      </div>

      {/* Writer */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Writer</strong></div>
        <ul className="inference-card-text">
          <li>• Writes the actual questions, using your course, unit, and examples as a guide.</li>
          <li>• Follows the Test Builder’s structure for consistency.</li>
          <li>• Focuses on clarity, fairness, and language that's right for your students.</li>
        </ul>
      </div>

      {/* Student Generator */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Student Generator</strong></div>
        <ul className="inference-card-text">
          <li>• Creates a realistic mix of student profiles based on your class settings.</li>
          <li>• Applies learning needs like ADHD, English learner status, or test anxiety.</li>
          <li>• Models how each student type would actually experience your assessment.</li>
        </ul>
      </div>

      {/* Analyst */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Analyst</strong></div>
        <ul className="inference-card-text">
          <li>• Runs a simulation of your students taking the assessment.</li>
          <li>• Predicts where students will succeed, struggle, or run out of time.</li>
          <li>• Produces easy-to-read summaries and flags students who may be at risk.</li>
        </ul>
      </div>

      {/* Philosopher */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Philosopher</strong></div>
        <ul className="inference-card-text">
          <li>• Explains the reasoning behind the choices that were made.</li>
          <li>• Translates the simulation data into plain language insights for teachers.</li>
          <li>• Points out anything worth reconsidering — without jargon.</li>
        </ul>
      </div>

      {/* Refiner */}
      <div className="inference-card">
        <div className="inference-card-header"><strong>The Refiner</strong></div>
        <ul className="inference-card-text">
          <li>• Revises questions that the simulation flagged as too confusing, too easy, or off-topic.</li>
          <li>• Fixes pacing issues and unclear wording automatically.</li>
          <li>• Makes sure the final version is something you'd actually feel good handing out.</li>
        </ul>
      </div>

    </div>



      
    </div>
  );
}
