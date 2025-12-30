import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Download, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { exportToJSON, downloadJSON, exportToCSV, downloadCSV, importFromJSON, ExportData } from '@/lib/exportImport'

export function ImportExportPage() {
  const [includeInProgress, setIncludeInProgress] = useState(true)
  const [includeFinished, setIncludeFinished] = useState(true)
  const [includePlayers, setIncludePlayers] = useState(true)
  const [includeModels, setIncludeModels] = useState(true)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      const data = await exportToJSON({
        includeInProgress,
        includeFinished,
        includePlayers,
        includeModels
      })
      downloadJSON(data)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const csv = await exportToCSV()
      downloadCSV(csv)
    } catch (error) {
      console.error('Export CSV error:', error)
      alert('Erreur lors de l\'export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportMessage(null)

    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)

      const result = await importFromJSON(data, importMode)

      setImportMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      })

      if (result.success) {
        // Reset file input
        event.target.value = ''
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportMessage({
        type: 'error',
        text: `Erreur lors de l'import : ${error instanceof Error ? error.message : 'Fichier invalide'}`
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="text-sm text-muted-foreground">
          Sauvegardez et restaurez vos données
        </p>
      </div>

      {/* Export JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Export JSON
          </CardTitle>
          <CardDescription>
            Exportez vos données au format JSON pour une sauvegarde complète
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Parties en cours</Label>
              <Switch checked={includeInProgress} onCheckedChange={setIncludeInProgress} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Parties terminées</Label>
              <Switch checked={includeFinished} onCheckedChange={setIncludeFinished} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Joueurs</Label>
              <Switch checked={includePlayers} onCheckedChange={setIncludePlayers} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Modèles de jeux</Label>
              <Switch checked={includeModels} onCheckedChange={setIncludeModels} />
            </div>
          </div>

          <Button
            onClick={handleExportJSON}
            disabled={isExporting || (!includeInProgress && !includeFinished && !includePlayers && !includeModels)}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Export en cours...' : 'Exporter en JSON'}
          </Button>
        </CardContent>
      </Card>

      {/* Export CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export CSV
          </CardTitle>
          <CardDescription>
            Exportez les résultats des parties terminées au format CSV (Excel)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Export en cours...' : 'Exporter en CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Import JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import JSON
          </CardTitle>
          <CardDescription>
            Restaurez vos données à partir d'un fichier JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border rounded-lg p-4 space-y-3">
              <Label>Mode d'import</Label>
              <button
                className={`w-full p-3 border rounded-lg text-left transition-colors touch-manipulation ${
                  importMode === 'merge' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                }`}
                onClick={() => setImportMode('merge')}
              >
                <div className="font-medium">Fusion</div>
                <div className="text-sm text-muted-foreground">
                  Ajoute les nouvelles données sans supprimer l'existant
                </div>
              </button>
              <button
                className={`w-full p-3 border rounded-lg text-left transition-colors touch-manipulation ${
                  importMode === 'replace' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                }`}
                onClick={() => setImportMode('replace')}
              >
                <div className="font-medium text-destructive">Remplacement</div>
                <div className="text-sm text-muted-foreground">
                  ⚠️ Supprime toutes les données existantes avant l'import
                </div>
              </button>
            </div>
          </div>

          {importMessage && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                importMessage.type === 'success'
                  ? 'bg-green-500/10 border-green-500/50 text-green-500'
                  : 'bg-red-500/10 border-red-500/50 text-red-500'
              }`}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{importMessage.text}</p>
            </div>
          )}

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="import-file"
            />
            <Button
              disabled={isImporting}
              className="w-full pointer-events-none"
              variant={importMode === 'replace' ? 'destructive' : 'default'}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Import en cours...' : 'Sélectionner un fichier JSON'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Format accepté : fichier JSON exporté depuis cette application
          </p>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Conseils</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Export JSON :</strong> Sauvegarde complète de vos données. Recommandé pour la backup.
          </p>
          <p>
            <strong>Export CSV :</strong> Données des parties terminées uniquement, compatible Excel.
            Utilise le séparateur ";" pour Excel français.
          </p>
          <p>
            <strong>Import Fusion :</strong> Conserve vos données existantes et ajoute les nouvelles.
          </p>
          <p>
            <strong>Import Remplacement :</strong> Efface tout et restaure uniquement les données du fichier.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
