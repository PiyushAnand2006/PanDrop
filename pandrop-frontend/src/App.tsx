import { useCallback, useEffect, useState } from "react";
import type { JobResponse } from "./types/pandrop";
import { checkHealth, processVideo } from "./lib/api";
import { buildDemoJob } from "./lib/demoJob";
import Atmosphere from "./components/Atmosphere";
import TopBar, { type BackendState } from "./components/TopBar";
import Landing from "./components/Landing";
import Processing from "./components/Processing";
import Studio from "./components/Studio";

type View = "landing" | "processing" | "studio";

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [job, setJob] = useState<JobResponse | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [task, setTask] = useState<(() => Promise<JobResponse>) | null>(null);
  const [backend, setBackend] = useState<BackendState>("checking");

  /* ---------------- backend liveness ---------------- */
  useEffect(() => {
    let alive = true;
    const probe = async () => {
      try {
        await checkHealth();
        if (alive) setBackend("online");
      } catch {
        if (alive) setBackend("offline");
      }
    };
    void probe();
    const id = setInterval(probe, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /* ---------------- flows ---------------- */
  const handleFile = useCallback((file: File) => {
    setUploadError(null);
    setIsDemo(false);
    setFileName(file.name);
    // Start the request eagerly so StrictMode double-mount can't double-POST.
    const promise = processVideo(file);
    promise.catch(() => {}); // Processing view owns the surfaced error
    setTask(() => () => promise);
    setView("processing");
  }, []);

  const handleDemo = useCallback(() => {
    setUploadError(null);
    setIsDemo(true);
    setFileName(null);
    const promise = new Promise<JobResponse>((resolve) =>
      setTimeout(() => resolve(buildDemoJob()), 180),
    );
    setTask(() => () => promise);
    setView("processing");
  }, []);

  const handleDone = useCallback((result: JobResponse) => {
    setJob(result);
    // isDemo was already set by the entry flow (handleDemo/handleFile);
    // the demo job keeps its real backend job id, so don't second-guess it here.
    setView("studio");
    window.scrollTo({ top: 0 });
  }, []);

  const handleReset = useCallback(() => {
    setView("landing");
    setJob(null);
    setIsDemo(false);
    setTask(null);
    setUploadError(null);
    window.scrollTo({ top: 0 });
  }, []);

  const runTask = useCallback(() => (task ? task() : Promise.reject(new Error("no task"))), [task]);

  return (
    <div className="relative min-h-screen bg-obsidian text-ink">
      <Atmosphere />
      <TopBar
        backend={backend}
        isDemo={isDemo}
        inStudio={view === "studio"}
        onReset={handleReset}
      />

      <div>
        {view === "landing" && (
          <Landing
            onFile={handleFile}
            onDemo={handleDemo}
            backend={backend}
            initialError={uploadError}
          />
        )}

        {view === "processing" && task && (
          <Processing
            task={runTask}
            accelerated={isDemo}
            fileName={fileName}
            onDone={handleDone}
            onCancel={handleReset}
          />
        )}

        {view === "studio" && job && (
          <Studio job={job} isDemo={isDemo} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
