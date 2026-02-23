export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-1">Page introuvable</h2>
        <p className="text-sm text-muted-foreground">
          La page que vous cherchez n&apos;existe pas.
        </p>
      </div>
    </div>
  );
}
