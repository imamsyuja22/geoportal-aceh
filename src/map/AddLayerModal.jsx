import React, { useEffect, useState } from 'react'
import { getAllDatasets } from '../api/datasetApi'
import shp from 'shpjs'

function AddLayerModal({
  onClose,
  onAdd,
  onAddFile
}) {
  const [activeTab, setActiveTab] = useState('DATASET') 
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [serverCategory, setServerCategory] = useState('')
  const [selectedServer, setSelectedServer] = useState('')
  const [simpulKeyword, setSimpulKeyword] = useState('')
  const [showSimpulWarning, setShowSimpulWarning] = useState(false)
  const [simpulError, setSimpulError] = useState('')

  const [selectedFiles, setSelectedFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [processingFile, setProcessingFile] = useState(false)

  const [urlServerCat, setUrlServerCat] = useState('')
  const [urlSelectedServer, setUrlSelectedServer] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlType, setUrlType] = useState('Geoserver (OGC)')
  const [urlResults, setUrlResults] = useState([])
  const [urlError, setUrlError] = useState('')

  const simpulData = {
    'Kementerian/Lembaga': ['Badan Informasi Geospasial', 'Kementerian Dalam Negeri', 'BNPB', 'LAPAN'],
    'Pemerintah Provinsi': ['Provinsi Aceh', 'Provinsi Sumatera Utara', 'Provinsi DKI Jakarta'],
    'Pemerintah Kabupaten/Kota': ['Kota Banda Aceh', 'Kabupaten Aceh Besar', 'Kota Sabang', 'Kabupaten Pidie']
  }

  const urlServerMapping = {
    'Kementerian/Lembaga': [
      { name: 'Lembaga Penerbangan dan Antariksa Nasional [FAIL]', url: 'http://spacemap.lapan.go.id/erdas-apollo/catalog/csw?version=2.0' },
      { name: 'Badan Informasi Geospasial [OK]', url: 'https://tanahair.indonesia.go.id/geoserver' }
    ],
    'Pemerintah Provinsi': [
      { name: 'Provinsi Aceh [OK]', url: 'https://sig.acehprov.go.id/catalogue/csw' },
      { name: 'Provinsi Kalimantan Selatan [OK]', url: 'https://geoportal.kalselprov.go.id/geoserver' }
    ],
    'Pemerintah Kabupaten/Kota': [
      { name: 'Kota Banda Aceh [OK]', url: 'https://geoportal.bandaacehkota.go.id/geoserver' }
    ]
  };

  useEffect(() => {
    let cancelled = false
    async function loadDatasets() {
      try {
        setLoading(true)
        const data = await getAllDatasets()
        if (!cancelled) setDatasets(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) setError('Gagal memuat dataset.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDatasets()
    return () => { cancelled = true }
  }, [])

  const handleSimpulSearch = () => {
    setSimpulError('')
    setShowSimpulWarning(false)

    if (!serverCategory) {
      setSimpulError('Silakan pilih Kategori Server terlebih dahulu.')
      return
    }

    if (!simpulKeyword.trim()) {
      setSimpulError('Masukkan kata kunci pencarian.')
      return
    }

    if (simpulKeyword) {
      setShowSimpulWarning(true)
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    setFileError('')
  
    if (files.length === 0) {
      setSelectedFiles([])
      return
    }
  
    const allowedExtensions = ['.shp', '.shx', '.dbf', '.prj']
    const invalidFiles = files.filter(
      file => !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    )
  
    if (invalidFiles.length > 0) {
      setFileError('File tidak sesuai format! Hanya diperbolehkan file .shp, .shx, .dbf, dan .prj.')
      setSelectedFiles([])
      return
    }
  
    setSelectedFiles(files)
  }

  const validateShapefileSet = () => {
    const shpFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.shp'))
    const shxFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.shx'))
    const dbfFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.dbf'))
  
    if (!shpFile || !shxFile || !dbfFile) {
      setFileError('Kumpulan Shapefile belum lengkap! Wajib memilih file .shp, .shx, dan .dbf sekaligus.')
      return false
    }
  
    const getBaseName = (filename) => filename.replace(/\.(shp|shx|dbf|prj)$/i, '').toLowerCase()
    const baseNames = [shpFile, shxFile, dbfFile].map(file => getBaseName(file.name))
  
    if (!baseNames.every(name => name === baseNames[0])) {
      setFileError('Nama file tidak cocok! File .shp, .shx, dan .dbf harus memiliki nama depan yang persis sama.')
      return false
    }
  
    return true
  }

  const handleAddFile = async () => {
    if (!validateShapefileSet()) return
  
    try {
      setProcessingFile(true)
      setFileError('')
  
      const shpFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.shp'))
      const dbfFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.dbf'))
      const prjFile = selectedFiles.find(file => file.name.toLowerCase().endsWith('.prj'))
  
      const shpBuffer = await shpFile.arrayBuffer()
      const dbfBuffer = await dbfFile.arrayBuffer()
      let prjText = prjFile ? await prjFile.text() : null
  
      const geojson = await shp({
        shp: shpBuffer,
        dbf: dbfBuffer,
        prj: prjText || undefined
      })
  
      if (!geojson) {
        throw new Error('GeoJSON tidak berhasil dibuat.')
      }

      const layerName = shpFile.name.replace(/\.shp$/i, '')
      const fileLayer = {
        id: `file-${Date.now()}`,
        name: layerName,
        source: 'file',
        visible: true,
        geojson,
        featureInfoTemplate: null,
      }

      onAddFile(fileLayer)  
      onClose()
    } catch (error) {
      console.error('Gagal membaca Shapefile:', error)
      setFileError('Gagal memproses file! Pastikan file tidak rusak dan menggunakan proyeksi EPSG:4326.')
    } finally {
      setProcessingFile(false)
    }
  }

  const handleGetUrlData = () => {
    setUrlError('');
    setUrlResults([]);

    if (!urlServerCat) {
      setUrlError('Pilih Kategori Server terlebih dahulu!');
      return;
    }

    if (!urlSelectedServer) {
      setUrlError('Pilih Nama Server terlebih dahulu!');
      return;
    }

    if (urlSelectedServer.includes('[FAIL]')) {
      setUrlError('Gagal terhubung ke server (Time Out)! Periksa kembali koneksi atau URL server.');
    } else if (urlSelectedServer.includes('[OK]')) {
      setUrlResults([
        {
          id: 1,
          title: "Peta Jumlah Desa yang sudah menggunakan pelayanan administrasi Pemerintahan secara digital melalui SIGAP",
          update: "2026-08-08T08:00:00Z",
          instansi: "DPMG Aceh"
        }
      ]);
    }
  }

  const getID = (item) => (item?.id || item?.pk || null);
  const getInstitution = (dataset) => {
    const owner = dataset?.owner;
    if (!owner) return '-';
    return `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || owner.username || '-';
  };

  const getCategory = (dataset) => {
    const category = dataset?.category;
    if (!category) return '-';
    return category.gn_description || category.description || category.identifier || '-';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="aceh-modal dark-theme large" onClick={(e) => e.stopPropagation()}>
        
        <div className="aceh-modal-header">
          <span>Tambahkan Peta</span>
          <button onClick={onClose} className="close-btn-x">✖</button>
        </div>

        <div className="modal-tabs">
          <button className={`tab ${activeTab === 'DATASET' ? 'active' : ''}`} onClick={() => setActiveTab('DATASET')}>DATASET</button>
          <button className={`tab ${activeTab === 'SIMPUL' ? 'active' : ''}`} onClick={() => setActiveTab('SIMPUL')}>SIMPUL</button>
          <button className={`tab ${activeTab === 'FILE' ? 'active' : ''}`} onClick={() => setActiveTab('FILE')}>FILE</button>
          <button className={`tab ${activeTab === 'URL' ? 'active' : ''}`} onClick={() => setActiveTab('URL')}>URL</button>
        </div>

        <div className="modal-body">
          
          {/* TAB 1: DATASET */}
          {activeTab === 'DATASET' && (
            <>
              <div className="form-group-guidance">
                <div className="search-box-container">
                  <input 
                    type="text" 
                    placeholder="Masukkan kata kunci pencarian (contoh: Jalan, Sungai, Batas Wilayah)..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  <button className="btn-search">Cari</button>
                </div>
                <small className="help-text">Ketik nama dataset untuk menyaring daftar peta yang tersedia.</small>
              </div>

              {error && <div className="url-error-box">{error}</div>}

              <div className="dataset-list">
                {loading ? <p className="loading-text">Memuat dataset...</p> : 
                  datasets.filter(d => (d.title || d.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((dataset) => (
                    <div
                      key={getID(dataset)}
                      className={`dataset-card ${getID(selected) === getID(dataset) ? 'selected' : ''}`}
                      onClick={() => setSelected(dataset)}
                    >
                      <div className="dataset-icon">🗺️</div>
                      <div className="dataset-info">
                        <h6>[{getID(dataset)}] {dataset.title || dataset.name}</h6>
                        <p>Instansi : {getInstitution(dataset)}</p>
                        <p>Kategori : {getCategory(dataset)}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="selected-label">
                Selected Layer: <span className="highlight">{selected ? (selected.title || selected.name) : '-'}</span>
              </div>
            </>
          )}

          {/* TAB 2: SIMPUL */}
          {activeTab === 'SIMPUL' && (
            <div className="simpul-container">
              <div className="form-group-simpul">
                <label>Server Kategori :</label>
                <select value={serverCategory} onChange={(e) => { setServerCategory(e.target.value); setSelectedServer(''); setSimpulError(''); }}>
                  <option value="">--- Pilih Server Kategori ---</option>
                  {Object.keys(simpulData).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <small className="help-text">Pilih tingkatan instansi pengelola jaringan.</small>
              </div>

              <div className="form-group-simpul">
                <label>Pilih Server :</label>
                <select value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)} disabled={!serverCategory}>
                  <option value="">--- Semua Server ---</option>
                  {serverCategory && simpulData[serverCategory].map(srv => <option key={srv} value={srv}>{srv}</option>)}
                </select>
                <small className="help-text">Pilih spesifik nama instansi/daerah (Opsional).</small>
              </div>

              <div className="form-group-simpul">
                <label>Kata Kunci :</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    placeholder="Contoh: peta, tata ruang, persampahan" 
                    value={simpulKeyword} 
                    onChange={(e) => { setSimpulKeyword(e.target.value); setSimpulError(''); }} 
                  />
                  <button className="btn-search-simpul" onClick={handleSimpulSearch}>Cari</button>
                </div>
                <small className="help-text">Masukkan istilah atau tema peta yang ingin dicari.</small>
              </div>

              {simpulError && <div className="url-error-box">{simpulError}</div>}
              {showSimpulWarning && <div className="warning-box-simpul">Tidak dapat terhubung dengan Server Simpul! Periksa kembali jaringan Anda.</div>}
              <div className="simpul-result-placeholder"></div>
            </div>
          )}

          {/* TAB 3: FILE */}
          {activeTab === 'FILE' && (
            <div className="file-upload-container">
              <div className="notice-box-file">
                <strong>💡 Petunjuk Pengunggahan File Shapefile:</strong>
                <p>
                  - Minimal pilih 3 file sekaligus: <b>.shp</b>, <b>.shx</b>, dan <b>.dbf</b> dengan nama dasar yang sama.<br/>
                  - File <b>.prj</b> opsional namun disarankan untuk sistem proyeksi (EPSG:4326).<br/>
                  - Pastikan data tidak memiliki dimensi Z (3D).
                </p>
              </div>

              <div className="file-input-wrapper">
                <input
                  type="text"
                  className="file-path-display"
                  placeholder="Pilih file .shp, .shx, .dbf dari komputer Anda..."
                  value={selectedFiles.length > 0 ? `${selectedFiles.length} file dipilih` : ''}
                  readOnly
                />
                <label className="btn-browse">
                  Browse
                  <input
                    type="file"
                    multiple
                    accept=".shp,.shx,.dbf,.prj"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <small className="help-text" style={{ marginBottom: '10px' }}>
                Tekan tombol 'Browse' dan tahan tombol <b>Ctrl / Shift</b> untuk memilih beberapa file sekaligus.
              </small>

              {selectedFiles.length > 0 && (
                <div className="selected-files-list">
                  {selectedFiles.map((file, index) => (
                    <div className="file-info-selected" key={`${file.name}-${index}`}>
                      <span>📄 {file.name}</span>
                      <small>{(file.size / 1024).toFixed(2)} KB</small>
                    </div>
                  ))}
                </div>
              )}

              {fileError && <div className="file-error-message">{fileError}</div>}
            </div>
          )}

          {/* TAB 4: URL */}
          {activeTab === 'URL' && (
            <div className="url-tab-container">
              <div className="form-group-url">
                <label>Server Kategori:</label>
                <select value={urlServerCat} onChange={(e) => { setUrlServerCat(e.target.value); setUrlSelectedServer(''); setUrlInput(''); setUrlError(''); }}>
                  <option value="">--- Pilih Kategori Server ---</option>
                  {Object.keys(urlServerMapping).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <small className="help-text">Pilih kategori instansi penyedia Web Service.</small>
              </div>

              <div className="form-group-url">
                <label>Pilih Server :</label>
                <select 
                  value={urlSelectedServer} 
                  onChange={(e) => {
                    setUrlSelectedServer(e.target.value);
                    const found = urlServerMapping[urlServerCat]?.find(s => s.name === e.target.value);
                    setUrlInput(found ? found.url : '');
                    setUrlError('');
                  }}
                  disabled={!urlServerCat}
                >
                  <option value="">--- Pilih Simpul Jaringan Informasi Geospasial ---</option>
                  {urlServerCat && urlServerMapping[urlServerCat].map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <small className="help-text">Pilih nama layanan geoportal yang aktif.</small>
              </div>

              <div className="form-group-url">
                <label>Url :</label>
                <input 
                  type="text" 
                  className="url-display-input" 
                  value={urlInput} 
                  readOnly 
                  placeholder="URL endpoint MapServer / Rest API akan terisi otomatis..." 
                />
                <small className="help-text">Tautan alamat link server yang terpilih.</small>
              </div>

              <div className="form-group-url type-row">
                <label>Type:</label>
                <div className="type-action-group">
                  <select value={urlType} onChange={(e) => setUrlType(e.target.value)}>
                    <option>Geoserver (OGC)</option>
                    <option>Esri Rest (MapServer)</option>
                    <option>Geoportal Palapa (json)</option>
                    <option>Katalog Service for the Web (CSW)</option>
                  </select>
                  <button className="btn-get-data" onClick={handleGetUrlData}>GET DATA</button>
                </div>
              </div>

              {urlError && <div className="url-error-box">{urlError}</div>}

              <div className="url-results-list">
                {urlResults.map(res => (
                  <div key={res.id} className="metadata-card">
                    <div className="metadata-thumb">Not found image thumbnail</div>
                    <div className="metadata-content">
                      <h6>[{res.id}] {res.title}</h6>
                      <p>Update : {res.update}</p>
                      <div className="metadata-links">
                        <span className="badge-link">LINK</span>
                        <span className="badge-link">WMS</span>
                        <span className="badge-link">WFS</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn-close-modal" onClick={onClose}>✖ Close</button>
          <button
            className="btn-add-modal"
            disabled={
              activeTab === 'DATASET'
                ? !selected
                : activeTab === 'FILE'
                  ? selectedFiles.length === 0 || processingFile
                  : true
            }
            onClick={() => {
              if (activeTab === 'DATASET' && selected) {
                onAdd(selected)
              } else if (activeTab === 'FILE') {
                handleAddFile()
              }
            }}
          >
            {processingFile ? 'Memproses...' : '➕ Add'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddLayerModal