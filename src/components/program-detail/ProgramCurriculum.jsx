import {Reveal} from "../motionPrimitives";

const ProgramCurriculum = ({program}) => {
  return (
    <section className="pd-section pd-section--alt" id="pd-curriculum">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Curriculum</p>
          <h2>{program.fullTitle || program.title} curriculum</h2>
          <p>{program.curriculumIntro || program.description}</p>
        </Reveal>

        {program.modules?.length > 0 ? (
          <>
            <p className="pd-module-count">
              {program.modules.length} modules · learning roadmap
            </p>
            <div className="pd-modules">
              {program.modules.map((module, index) => (
                // Open the first module so the section reads as content, not as
                // a wall of closed rows.
                <details className="pd-module" key={module.n} open={index === 0}>
                  <summary>
                    <span className="pd-module__n">
                      {String(module.n).padStart(2, "0")}
                    </span>
                    {module.title}
                  </summary>
                  <ul>
                    {module.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="pd-outline">
            {[
              ["Overview", program.overview],
              ["Curriculum", program.curriculum],
              ["Outcomes", program.outcomes],
            ].map(([label, points]) => (
              <article className="pd-outline__card" key={label}>
                <h3>{label}</h3>
                <ul>
                  {points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProgramCurriculum;