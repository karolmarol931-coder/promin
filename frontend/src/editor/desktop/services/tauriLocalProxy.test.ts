// @vitest-environment node
import { describe, expect, test } from "vitest";

import { materializeLocalFormData } from "@editor/services/tauriLocalProxy";

describe("materializeLocalFormData", () => {
  test("copies text fields and file bytes without changing names or order", async () => {
    const form = new FormData();
    form.append(
      "fileInput",
      new File(["%PDF-test"], "report.pdf", { type: "application/pdf" }),
    );
    form.append("tag", "first");
    form.append("tag", "second");
    form.append(
      "attachment",
      new Blob(["note"], { type: "text/plain" }),
      "note.txt",
    );

    const copy = await materializeLocalFormData(form);

    expect(copy).not.toBe(form);
    expect([...copy.keys()]).toEqual(["fileInput", "tag", "tag", "attachment"]);
    expect(copy.get("tag")).toBe("first");
    expect(copy.getAll("tag")).toEqual(["first", "second"]);

    const pdf = copy.get("fileInput");
    expect(pdf).toBeInstanceOf(File);
    expect((pdf as File).name).toBe("report.pdf");
    expect((pdf as File).type).toBe("application/pdf");
    expect(await (pdf as File).text()).toBe("%PDF-test");

    const attachment = copy.get("attachment");
    expect(attachment).toBeInstanceOf(File);
    expect((attachment as File).name).toBe("note.txt");
    expect((attachment as File).type).toBe("text/plain");
    expect(await (attachment as File).text()).toBe("note");
  });
});
