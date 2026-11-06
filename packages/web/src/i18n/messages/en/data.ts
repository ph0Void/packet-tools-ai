const data = {
  header: {
    title: "RAG knowledge base",
    description:
      "Documents and technical manuals vector-indexed for agentic queries.",
  },
  upload: {
    title: "Upload document",
    hint: "PDF, TXT or MD files up to 25MB. They will be indexed for RAG.",
    dropzone: "Drag a file here or click to select it",
    selected: "Selected: {name} ({size} MB)",
    formats: ".pdf · .txt · .md · max 25MB",
    titleLabel: "Custom title (optional)",
    titlePlaceholder: "e.g. Cisco IOS 15 command manual",
    submit: "Upload Document",
    submitting: "Uploading and indexing...",
    success: "Document uploaded successfully.",
    ringUploading: "Uploading document…",
    ringProcessing: "Processing and indexing…",
    doneTitle: "Document uploaded",
    doneBody: "The document was added to the knowledge base.",
    errorTitle: "Upload failed",
    errorBody: "Check the file and try again.",
  },
  errors: {
    format: "File type not allowed. Only .pdf, .txt and .md files are accepted.",
    size: "The file exceeds the 25MB limit.",
  },
  list: {
    title: "Indexed documents",
    hintManage: "Manage the documents available to the AI.",
    hintRead: "Browse the documents available to the AI.",
    searchPlaceholder: "Search documents...",
    searchAria: "Search documents",
    columnTitle: "Title",
    columnType: "Type",
    columnDate: "Date",
    columnActions: "Actions",
    empty: "There are no documents in the knowledge base.",
    noResults: "No results for this search.",
    viewAria: "View {title}",
    deleteAria: "Delete {title}",
  },
  remove: {
    confirm: 'Delete the document "{title}" from the knowledge base?',
    success: "Document deleted.",
    error: "Error deleting the document.",
  },
};

export default data;
