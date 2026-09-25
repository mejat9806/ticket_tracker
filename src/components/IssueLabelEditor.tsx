import { useState } from 'react';
import { loadSavedFilter } from '../utils/github';

type Issue = { number: number; title: string; state: string; labels: string[] };

type IssueLabelEditorProps = {
  issue: Issue;
  onSave: (labels: string[]) => void;
};

export default function IssueLabelEditor(props: IssueLabelEditorProps) {
  const [labels, setLabels] = useState<string[]>(props.issue.labels);
  const [showHelp, setShowHelp] = useState(false);
  const filter = loadSavedFilter();

  const handleRemove = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4">
      <h2>
        {props.issue.title} ({props.issue.state})
      </h2>
      <p>Repository: {filter.repo ?? '???'}</p>

      <label htmlFor="new-label">Add lable</label>
      <input id="label-input" className="border" />

      <ul>
        {labels.map((label, index) => (
          <li key={index}>
            <input
              className="border"
              defaultValue={label}
              onBlur={(e) => {
                const next = [...labels];
                next[index] = e.target.value;
                setLabels(next);
              }}
            />
            <button type="button" onClick={() => handleRemove(index)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="text-blue-600 cursor-pointer" onClick={() => setShowHelp(!showHelp)}>
        Help
      </div>
      {showHelp && <p>labels is saved when you clicks Save.</p>}

      <button type="button">Reset</button>
      <button type="button" onClick={() => props.onSave(labels)}>
        Confirm
      </button>
    </div>
  );
}
