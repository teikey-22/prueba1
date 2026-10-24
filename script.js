
const $ = (id) => document.getElementById(id);

const formulario = $("formularioVenta");
const selectorProducto = $("producto");
const campoPrecio = $("precio");
const campoCantidad = $("cantidad");
const selectorPago = $("metodoPago");
const historial = $("historialVentas");
const mensajeVacio = $("mensajeVacio");
const notificacionVenta = $("notificacionVenta");

const preciosIniciales = {
  Gaseosa: 3000,
  Agua: 2000,
  Empanada: 2500
};

const formatoCOP = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(valor);

let ventas = [];

try {
  const datosGuardados = JSON.parse(
    localStorage.getItem("aquaFlorVentas") || "[]"
  );

  if (Array.isArray(datosGuardados)) {
    ventas = datosGuardados.filter((v) =>
      v &&
      typeof v.fecha === "string" &&
      ["Gaseosa", "Agua", "Empanada"].includes(v.producto) &&
      Number.isSafeInteger(v.precio) &&
      v.precio > 0 &&
      Number.isSafeInteger(v.cantidad) &&
      v.cantidad > 0 &&
      ["Efectivo", "Transferencia", "Tarjeta"].includes(v.pago)
    );
  }
} catch {
  ventas = [];
}

function guardarVentas() {
  try {
    localStorage.setItem(
      "aquaFlorVentas",
      JSON.stringify(ventas)
    );
    return true;
  } catch {
    alert("No se pudieron guardar los datos en el navegador.");
    return false;
  }
}

function actualizarPrecio() {
  campoPrecio.value = preciosIniciales[selectorProducto.value];
}

function notificarVenta(venta) {
  const total = formatoCOP(venta.precio * venta.cantidad);
  notificacionVenta.textContent = `Venta registrada: ${venta.cantidad} ${venta.producto} por ${total}.`;
  notificacionVenta.hidden = false;

  if (notificarVenta.temporizador) {
    clearTimeout(notificarVenta.temporizador);
  }
  notificarVenta.temporizador = setTimeout(() => {
    notificacionVenta.hidden = true;
  }, 5000);

  if (!("Notification" in window)) {
    return;
  }

  const mostrarNotificacion = () => {
    if (Notification.permission === "granted") {
      new Notification("Venta registrada", {
        body: `${venta.cantidad} ${venta.producto}: ${total}`
      });
    }
  };

  if (Notification.permission === "granted") {
    mostrarNotificacion();
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then(mostrarNotificacion).catch(() => {});
  }
}

selectorProducto.addEventListener("change", actualizarPrecio);

function crearCelda(fila, texto) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  fila.appendChild(celda);
  return celda;
}

function mostrarVentas() {
  historial.replaceChildren();

  let totalDinero = 0;
  let totalUnidades = 0;

  ventas.forEach((venta, indice) => {
    totalDinero += venta.precio * venta.cantidad;
    totalUnidades += venta.cantidad;

    const fila = document.createElement("tr");

    crearCelda(fila, venta.fecha);
    crearCelda(fila, venta.producto);
    crearCelda(fila, String(venta.cantidad));
    crearCelda(
      fila,
      formatoCOP(venta.precio * venta.cantidad)
    );
    crearCelda(fila, venta.pago);

    const celdaAccion = document.createElement("td");
    const botonEliminar = document.createElement("button");

    botonEliminar.type = "button";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.className = "accion-eliminar";
    botonEliminar.setAttribute(
      "aria-label",
      `Eliminar venta de ${venta.producto}`
    );

    botonEliminar.addEventListener("click", () => {
      if (confirm("¿Deseas eliminar esta venta?")) {
        const copiaAnterior = [...ventas];
        ventas.splice(indice, 1);

        if (!guardarVentas()) {
          ventas = copiaAnterior;
        }

        mostrarVentas();
      }
    });

    celdaAccion.appendChild(botonEliminar);
    fila.appendChild(celdaAccion);
    historial.appendChild(fila);
  });

  $("totalVentas").textContent = formatoCOP(totalDinero);
  $("totalUnidades").textContent = totalUnidades;

  mensajeVacio.hidden = ventas.length > 0;
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const producto = selectorProducto.value;
  const precio = Number(campoPrecio.value);
  const cantidad = Number(campoCantidad.value);

  if (
    !Number.isSafeInteger(precio) ||
    precio <= 0 ||
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    alert("Ingresa un precio y una cantidad válidos.");
    return;
  }

  const nuevaVenta = {
    fecha: new Date().toLocaleString("es-CO"),
    producto,
    precio,
    cantidad,
    pago: selectorPago.value
  };

  ventas.unshift(nuevaVenta);

  if (!guardarVentas()) {
    ventas.shift();
    return;
  }

  mostrarVentas();
  campoCantidad.value = 1;

  notificarVenta(nuevaVenta);
});

$("exportarCSV").addEventListener("click", () => {
  const escaparCSV = (valor) =>
    '"' + String(valor).replace(/"/g, '""') + '"';

  const filas = [
    ["Fecha", "Producto", "Precio unitario", "Cantidad", "Total", "Pago"],
    ...ventas.map((v) => [
      v.fecha,
      v.producto,
      v.precio,
      v.cantidad,
      v.precio * v.cantidad,
      v.pago
    ])
  ];

  const contenido =
    "\uFEFF" +
    filas
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\r\n");

  const archivo = new Blob([contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "reporte-ventas-aqua-flor.csv";
  enlace.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("borrarVentas").addEventListener("click", () => {
  if (!confirm("¿Deseas borrar todo el historial de ventas?")) {
    return;
  }

  const copiaAnterior = ventas;
  ventas = [];

  if (!guardarVentas()) {
    ventas = copiaAnterior;
  }

  mostrarVentas();
});

mostrarVentas();
