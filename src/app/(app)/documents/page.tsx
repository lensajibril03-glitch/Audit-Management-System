import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage() {
  await requireSession();
  const docs = await prisma.document.findMany({
    include: { uploader: true },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Documents / User Guide</h1>
      {docs.length === 0 ? (
        <div className="app-card p-6 text-sm text-muted">
          No documents uploaded yet. Authorized administrators can add user guides, templates, policies, and reference documents.
        </div>
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-alt text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Uploaded By</th>
                <th className="px-3 py-2">Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="px-3 py-2">{d.category}</td>
                  <td className="px-3 py-2">{d.uploader.name}</td>
                  <td className="px-3 py-2">{formatDate(d.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
