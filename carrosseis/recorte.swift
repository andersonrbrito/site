// Recorta a pessoa da foto (Vision do macOS) e salva PNG com fundo transparente. Uso: swift recorte.swift in.jpg out.png
import Vision; import CoreImage; import AppKit
let a = CommandLine.arguments
let ci = CIImage(contentsOf: URL(fileURLWithPath: a[1]))!
let req = VNGenerateForegroundInstanceMaskRequest()
let h = VNImageRequestHandler(ciImage: ci)
try! h.perform([req])
let r = req.results!.first!
let buf = try! r.generateMaskedImage(ofInstances: r.allInstances, from: h, croppedToInstancesExtent: false)
let out = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
try! ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: a[2]), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
