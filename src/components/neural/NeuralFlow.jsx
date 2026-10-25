import {Suspense, lazy, useEffect, useMemo, useRef, useState} from "react";
import {NeuralFlowContext, createFlowState, createLook, readMode, whenLoadedAndIdle} from "./flow";
import "./neural-flow.css";

// Wraps the hero and the scroll story so one brain can travel through both.
// On wide screens a sticky stage behind them holds a single canvas: the brain
// starts in the hero's visual column, glides to centre as the hero scrolls
// away while the page darkens into midnight, and the story's timeline picks
// it up from that exact frame. Elsewhere the children render their own still
// copies of the same scene (see Hero.jsx and NeuralStory.jsx).

// three.js + GSAP: fetched after the page has loaded (the headline is the LCP).
const FlowStage = lazy(() => import("./FlowStage"));

const NeuralFlow = ({children}) => {
  const ref = useRef(null);
  const [look] = useState(createLook);
  const [state] = useState(createFlowState);
  const [mode] = useState(readMode);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mode.cinematic) return undefined;
    return whenLoadedAndIdle(() => setLoaded(true));
  }, [mode]);

  const value = useMemo(() => ({look, mode, state}), [look, mode, state]);

  return (
    <NeuralFlowContext.Provider value={value}>
      <div ref={ref} className={`nf${mode.cinematic ? " nf--cinematic" : ""}${ready ? " nf--ready" : ""}`}>
        {mode.cinematic && (
          <div className="nf-backdrop" aria-hidden="true">
            <div className="nf-stage">
              <div className="nf-night" />
              {loaded && (
                <Suspense fallback={null}>
                  <FlowStage flowRef={ref} look={look} state={state} mode={mode} onReady={() => setReady(true)} />
                </Suspense>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </NeuralFlowContext.Provider>
  );
};

export default NeuralFlow;
