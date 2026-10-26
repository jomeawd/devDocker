# Image de base faite maison : aucune image de Docker Hub, on part de rien (scratch)
# et on décompresse le rootfs officiel d'Alpine téléchargé sur alpinelinux.org.
FROM scratch

# TARGETARCH est rempli automatiquement par BuildKit (arm64 sur Mac M1/M2, amd64 sur PC).
# ADD décompresse tout seul une archive .tar.gz locale.
ARG TARGETARCH
ADD rootfs-${TARGETARCH}.tar.gz /

ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
CMD ["/bin/sh"]
